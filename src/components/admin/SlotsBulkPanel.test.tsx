// @vitest-environment jsdom
// src/components/admin/SlotsBulkPanel.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildServices } from '@/test/fixtures/buildAppointmentListItem';

// Les Server Actions importent du code serveur (cookies, Supabase) : on les remplace par des doublures.
const actions = vi.hoisted(() => ({ blockSlotsInRangeAction: vi.fn(), deleteAvailableSlotsAction: vi.fn() }));
vi.mock('@/app/actions/admin/slots', () => actions);

const toast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const granted = vi.hoisted(() => ({ rights: new Set<string>() }));
vi.mock('@/components/admin/PermissionsProvider', () => ({
  usePermissions: () => ({
    role: 'admin',
    isSuperadmin: false,
    can: (domain: string, action: string) => granted.rights.has(`${domain}.${action}`),
  }),
}));

import { SlotsBulkPanel } from './SlotsBulkPanel';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
const t = messages.admin.slots.bulk;

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fr" messages={messages}>
        <SlotsBulkPanel locale="fr" services={buildServices()} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

const expand = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: t.toggle }));
  return user;
};

beforeEach(() => {
  granted.rights = new Set(['slots.view']);
  Object.values(actions).forEach((action) => action.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());
});

describe('SlotsBulkPanel', () => {
  it('ne s\'affiche pas sans droit de modification ni de suppression', () => {
    const { container } = renderPanel();

    expect(container.firstChild).toBeNull();
  });

  it('propose seulement Bloquer avec slots.edit', async () => {
    granted.rights.add('slots.edit');
    renderPanel();
    await expand();

    expect(screen.getByRole('button', { name: t.block })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.delete })).toBeNull();
  });

  it('propose seulement Supprimer avec slots.delete', async () => {
    granted.rights.add('slots.delete');
    renderPanel();
    await expand();

    expect(screen.getByRole('button', { name: t.delete })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.block })).toBeNull();
  });

  it('demande une confirmation qui décrit le périmètre, puis bloque avec la période choisie', async () => {
    granted.rights.add('slots.edit');
    actions.blockSlotsInRangeAction.mockResolvedValue({ success: true, blocked: 3, skippedBooked: 0 });
    renderPanel();
    const user = await expand();

    await user.click(screen.getByRole('button', { name: t.block }));
    // Rien n'est parti tant que l'admin n'a pas confirmé.
    expect(actions.blockSlotsInRangeAction).not.toHaveBeenCalled();
    expect(await screen.findByText(t.confirmBlockTitle)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: t.confirmBlockButton }));

    await waitFor(() => expect(actions.blockSlotsInRangeAction).toHaveBeenCalledTimes(1));
    expect(actions.blockSlotsInRangeAction).toHaveBeenCalledWith(
      expect.objectContaining({ from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 créneaux bloqués.'));
  });

  it('signale les créneaux réservés laissés intacts', async () => {
    granted.rights.add('slots.edit');
    actions.blockSlotsInRangeAction.mockResolvedValue({ success: true, blocked: 2, skippedBooked: 1 });
    renderPanel();
    const user = await expand();

    await user.click(screen.getByRole('button', { name: t.block }));
    await user.click(await screen.findByRole('button', { name: t.confirmBlockButton }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('2 créneaux bloqués, 1 créneaux déjà réservés non modifiés.'),
    );
  });

  it('affiche l\'erreur traduite quand le serveur refuse', async () => {
    granted.rights.add('slots.edit');
    actions.blockSlotsInRangeAction.mockResolvedValue({ success: false, error: 'FORBIDDEN' });
    renderPanel();
    const user = await expand();

    await user.click(screen.getByRole('button', { name: t.block }));
    await user.click(await screen.findByRole('button', { name: t.confirmBlockButton }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.errors.codes.FORBIDDEN));
  });

  it('supprime après confirmation, et désactive la suppression quand une plage horaire est saisie', async () => {
    granted.rights.add('slots.delete');
    actions.deleteAvailableSlotsAction.mockResolvedValue({ success: true, deleted: 5 });
    renderPanel();
    const user = await expand();

    // La plage horaire ne vaut que pour le blocage : la combiner à une suppression prêterait à confusion.
    fireEvent.change(screen.getByLabelText(t.windowStart), { target: { value: '12:00' } });
    expect((screen.getByRole('button', { name: t.delete }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(t.windowStart), { target: { value: '' } });

    await user.click(screen.getByRole('button', { name: t.delete }));
    await user.click(await screen.findByRole('button', { name: t.confirmDeleteButton }));

    await waitFor(() => expect(actions.deleteAvailableSlotsAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('5 créneaux supprimés.'));
  });
});
