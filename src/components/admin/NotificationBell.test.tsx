// @vitest-environment jsdom
// src/components/admin/NotificationBell.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APPOINTMENT_ID, SERVICE_ID, buildServices } from '@/test/fixtures/buildAppointmentListItem';

// Action serveur : doublure, pour ne pas charger le code serveur (cookies, Supabase).
const getPendingNotificationsAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/actions/admin/dashboard', () => ({ getPendingNotificationsAction }));

const toast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * Faux client Supabase : capture le rappel branché sur `postgres_changes` pour que les tests
 * simulent un évènement serveur, et expose les appels d'abonnement et de désabonnement.
 */
const realtime = vi.hoisted(() => {
  const state = {
    handler: null as null | ((payload: { eventType: string; new: Record<string, unknown> }) => void),
    filter: null as unknown,
    removeChannel: vi.fn(),
  };
  const channel = {
    on: vi.fn((_type: string, filter: unknown, handler: typeof state.handler) => {
      state.filter = filter;
      state.handler = handler;
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };
  return { state, channel, client: { channel: vi.fn(() => channel), removeChannel: state.removeChannel } };
});
vi.mock('@/infrastructure/supabase/client', () => ({ createClient: () => realtime.client }));

import { NotificationBell } from './NotificationBell';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
const t = messages.admin.navbar;

const NOTIFICATIONS = {
  success: true,
  pendingCount: 2,
  items: [
    { id: APPOINTMENT_ID, clientName: 'Alice Martin', serviceId: SERVICE_ID, slotDate: '2026-10-20', slotStartTime: '09:00:00' },
  ],
};

function renderBell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fr" messages={messages}>
        <NotificationBell services={buildServices()} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

/** Simule un évènement serveur sur la table des rendez-vous. */
const emit = (eventType: string, row: Record<string, unknown>) =>
  act(async () => {
    realtime.state.handler?.({ eventType, new: row });
  });

beforeEach(() => {
  getPendingNotificationsAction.mockReset();
  getPendingNotificationsAction.mockResolvedValue(NOTIFICATIONS);
  Object.values(toast).forEach((fn) => fn.mockReset());
  realtime.state.handler = null;
  realtime.state.removeChannel.mockReset();
  realtime.channel.on.mockClear();
  realtime.channel.subscribe.mockClear();
});

describe('NotificationBell — temps réel', () => {
  it('s\'abonne aux changements de la table des rendez-vous', () => {
    renderBell();

    expect(realtime.channel.on).toHaveBeenCalledTimes(1);
    expect(realtime.state.filter).toEqual({ event: '*', schema: 'public', table: 'appointments' });
    expect(realtime.channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('ferme l\'abonnement au démontage, sans fuite de canal', () => {
    const { unmount } = renderBell();

    unmount();

    expect(realtime.state.removeChannel).toHaveBeenCalledWith(realtime.channel);
  });

  it('affiche le nombre de demandes en attente', async () => {
    renderBell();

    expect(await screen.findByText('2')).toBeTruthy();
  });

  it('recharge la cloche et prévient par un toast quand une demande arrive', async () => {
    renderBell();
    await screen.findByText('2');
    expect(getPendingNotificationsAction).toHaveBeenCalledTimes(1);

    await emit('INSERT', { status: 'pending', client_name: 'Bruno Leroy' });

    await waitFor(() => expect(getPendingNotificationsAction).toHaveBeenCalledTimes(2));
    expect(toast.info).toHaveBeenCalledWith('Nouvelle demande de rendez-vous : Bruno Leroy');
  });

  it('recharge sans toast pour un rendez-vous créé confirmé par l\'équipe', async () => {
    renderBell();
    await screen.findByText('2');

    await emit('INSERT', { status: 'confirmed', client_name: 'Chloé Dubois' });

    await waitFor(() => expect(getPendingNotificationsAction).toHaveBeenCalledTimes(2));
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('recharge sans toast quand un rendez-vous est confirmé ou annulé', async () => {
    renderBell();
    await screen.findByText('2');

    await emit('UPDATE', { status: 'cancelled', client_name: 'Alice Martin' });

    await waitFor(() => expect(getPendingNotificationsAction).toHaveBeenCalledTimes(2));
    expect(toast.info).not.toHaveBeenCalled();
  });
});

describe('NotificationBell — liste', () => {
  it('lie chaque demande à la fiche du rendez-vous, filtrée sur les demandes en attente', async () => {
    renderBell();
    await screen.findByText('2');

    await userEvent.setup().click(screen.getByRole('button', { name: t.notifications }));
    const link = (await screen.findByRole('link', { name: /Alice Martin/ })) as HTMLAnchorElement;

    expect(link.getAttribute('href')).toContain(`open=${APPOINTMENT_ID}`);
    expect(link.getAttribute('href')).toContain('status=pending');
  });
});
