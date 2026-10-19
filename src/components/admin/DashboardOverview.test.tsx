// @vitest-environment jsdom
// src/components/admin/DashboardOverview.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionSet } from '@/domain/user/PermissionSet';
import { APPOINTMENT_ID, SERVICE_ID, buildServices } from '@/test/fixtures/buildAppointmentListItem';

// Actions serveur : doublures, pour ne pas charger le code serveur (cookies, Supabase).
const dashboardActions = vi.hoisted(() => ({
  getDashboardStatsAction: vi.fn(),
  getPendingNotificationsAction: vi.fn(),
  getUpcomingAppointmentsAction: vi.fn(),
  getAppointmentInsightsAction: vi.fn(),
  getFreeSlotsOutlookAction: vi.fn(),
}));
const appointmentActions = vi.hoisted(() => ({
  confirmAppointmentAction: vi.fn(),
  cancelAppointmentAction: vi.fn(),
}));
vi.mock('@/app/actions/admin/dashboard', () => dashboardActions);
vi.mock('@/app/actions/admin/appointments', () => appointmentActions);

const toast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// recharts a besoin de ResizeObserver et d'une taille réelle : les graphiques n'ont pas de logique à tester ici.
vi.mock('@/components/admin/AppointmentsChart', () => ({ AppointmentsChart: () => <div data-testid="appointments-chart" /> }));
vi.mock('@/components/admin/dashboard/ServiceActivityChart', () => ({
  ServiceActivityChart: () => <div data-testid="service-chart" />,
}));

import { DashboardOverview } from './DashboardOverview';
import { PermissionsProvider } from './PermissionsProvider';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
const t = messages.admin.dashboard;

const DAYS = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];

/** Admin qui lit et traite les rendez-vous et lit les créneaux. Chaque test en retire ce dont il a besoin. */
const FULL_RIGHTS = PermissionSet.defaults()
  .with('appointments', 'view', true)
  .with('appointments', 'edit', true)
  .with('slots', 'view', true);

function renderOverview(rights: PermissionSet = FULL_RIGHTS) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fr" messages={messages}>
        <PermissionsProvider role="admin" permissions={rights.toJSON()}>
          <DashboardOverview services={buildServices()} />
        </PermissionsProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values({ ...dashboardActions, ...appointmentActions }).forEach((action) => action.mockReset());
  Object.values(toast).forEach((fn) => fn.mockReset());

  dashboardActions.getDashboardStatsAction.mockResolvedValue({
    success: true,
    stats: { appointmentsToday: 3, appointmentsThisWeek: 7, pendingCount: 2, blockedSlotsToday: 1, last14Days: [] },
  });
  dashboardActions.getPendingNotificationsAction.mockResolvedValue({
    success: true,
    pendingCount: 2,
    items: [
      { id: APPOINTMENT_ID, clientName: 'Alice Martin', serviceId: SERVICE_ID, slotDate: '2026-10-20', slotStartTime: '09:00:00' },
    ],
  });
  dashboardActions.getUpcomingAppointmentsAction.mockResolvedValue({
    success: true,
    items: [
      {
        id: 'upcoming-1',
        clientName: 'Bruno Leroy',
        serviceId: SERVICE_ID,
        status: 'confirmed',
        slotDate: '2026-10-21',
        slotStartTime: '14:00:00',
        slotEndTime: '15:00:00',
      },
    ],
  });
  dashboardActions.getAppointmentInsightsAction.mockResolvedValue({
    success: true,
    insights: {
      from: '2026-09-19',
      to: '2026-11-18',
      total: 4,
      cancelled: 1,
      cancellationRate: 0.25,
      byService: [{ serviceId: SERVICE_ID, count: 3 }],
    },
  });
  dashboardActions.getFreeSlotsOutlookAction.mockResolvedValue({
    success: true,
    outlook: { days: DAYS.map((date, index) => ({ date, count: index === 1 ? 4 : 0 })), total: 4 },
  });
  appointmentActions.confirmAppointmentAction.mockResolvedValue({ success: true });
  appointmentActions.cancelAppointmentAction.mockResolvedValue({ success: true });
});

describe('DashboardOverview · droits', () => {
  it('affiche tous les widgets à un admin qui lit les rendez-vous et les créneaux', async () => {
    renderOverview();

    expect(await screen.findByText(t.statAppointmentsToday)).toBeTruthy();
    expect(await screen.findByText('Alice Martin')).toBeTruthy();
    expect(await screen.findByText('Bruno Leroy')).toBeTruthy();
    expect(await screen.findByText(/1 annulé sur 4/)).toBeTruthy();
    for (const title of [t.pending.title, t.upcoming.title, t.insights.title, t.freeSlots.title]) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
  });

  it('sans appointments.view : aucun widget de rendez-vous, et leurs actions ne sont jamais appelées', async () => {
    renderOverview(FULL_RIGHTS.with('appointments', 'view', false));

    expect(await screen.findByRole('heading', { name: t.freeSlots.title })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: t.pending.title })).toBeNull();
    expect(screen.queryByRole('heading', { name: t.upcoming.title })).toBeNull();
    expect(screen.queryByRole('heading', { name: t.insights.title })).toBeNull();
    expect(screen.queryByText(t.statAppointmentsToday)).toBeNull();

    expect(dashboardActions.getDashboardStatsAction).not.toHaveBeenCalled();
    expect(dashboardActions.getPendingNotificationsAction).not.toHaveBeenCalled();
    expect(dashboardActions.getUpcomingAppointmentsAction).not.toHaveBeenCalled();
    expect(dashboardActions.getAppointmentInsightsAction).not.toHaveBeenCalled();
  });

  it('sans slots.view : pas de widget des créneaux libres, et son action n\'est jamais appelée', async () => {
    renderOverview(FULL_RIGHTS.with('slots', 'view', false));

    expect(await screen.findByText('Alice Martin')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: t.freeSlots.title })).toBeNull();
    expect(dashboardActions.getFreeSlotsOutlookAction).not.toHaveBeenCalled();
  });
});

describe('DashboardOverview · gestion d\'erreur par widget', () => {
  it('garde les autres widgets quand l\'un échoue, et le recharge au clic sur Réessayer', async () => {
    dashboardActions.getAppointmentInsightsAction.mockResolvedValueOnce({ success: false, error: 'UNKNOWN' });
    renderOverview();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(messages.errors.codes.UNKNOWN);
    // Les autres widgets ne sont pas affectés.
    expect(await screen.findByText('Bruno Leroy')).toBeTruthy();
    expect(screen.getByRole('heading', { name: t.freeSlots.title })).toBeTruthy();

    await userEvent.setup().click(screen.getByRole('button', { name: t.retry }));

    expect(await screen.findByText(/1 annulé sur 4/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('DashboardOverview · demandes à traiter', () => {
  it('confirme une demande en un clic, puis recharge la file', async () => {
    renderOverview();
    await screen.findByText('Alice Martin');
    expect(dashboardActions.getPendingNotificationsAction).toHaveBeenCalledTimes(1);

    await userEvent.setup().click(screen.getByRole('button', { name: t.pending.confirm }));

    await waitFor(() => expect(appointmentActions.confirmAppointmentAction).toHaveBeenCalledWith(APPOINTMENT_ID));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(t.pending.confirmedToast));
    await waitFor(() => expect(dashboardActions.getPendingNotificationsAction).toHaveBeenCalledTimes(2));
  });

  it('demande confirmation avant d\'annuler, puis annule', async () => {
    renderOverview();
    await screen.findByText('Alice Martin');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: t.pending.cancel }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(appointmentActions.cancelAppointmentAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: t.pending.cancelConfirm }));

    await waitFor(() =>
      expect(appointmentActions.cancelAppointmentAction).toHaveBeenCalledWith({ appointmentId: APPOINTMENT_ID }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(t.pending.cancelledToast));
  });

  it('traduit l\'erreur d\'une confirmation refusée dans un toast', async () => {
    appointmentActions.confirmAppointmentAction.mockResolvedValue({ success: false, error: 'FORBIDDEN' });
    renderOverview();
    await screen.findByText('Alice Martin');

    await userEvent.setup().click(screen.getByRole('button', { name: t.pending.confirm }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(messages.errors.codes.FORBIDDEN));
  });

  it('sans appointments.edit : la file est visible mais sans boutons de traitement', async () => {
    renderOverview(FULL_RIGHTS.with('appointments', 'edit', false));

    expect(await screen.findByText('Alice Martin')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.pending.confirm })).toBeNull();
    expect(screen.queryByRole('button', { name: t.pending.cancel })).toBeNull();
  });
});

describe('DashboardOverview · états vides', () => {
  it('affiche un message clair quand il n\'y a ni demande, ni rendez-vous, ni créneau', async () => {
    dashboardActions.getPendingNotificationsAction.mockResolvedValue({ success: true, pendingCount: 0, items: [] });
    dashboardActions.getUpcomingAppointmentsAction.mockResolvedValue({ success: true, items: [] });
    dashboardActions.getAppointmentInsightsAction.mockResolvedValue({
      success: true,
      insights: { from: '2026-09-19', to: '2026-11-18', total: 0, cancelled: 0, cancellationRate: null, byService: [] },
    });
    dashboardActions.getFreeSlotsOutlookAction.mockResolvedValue({
      success: true,
      outlook: { days: DAYS.map((date) => ({ date, count: 0 })), total: 0 },
    });
    renderOverview();

    expect(await screen.findByText(t.pending.empty)).toBeTruthy();
    expect(await screen.findByText(t.upcoming.empty)).toBeTruthy();
    expect(await screen.findByText(t.insights.empty)).toBeTruthy();
    expect(await screen.findByText(t.freeSlots.none)).toBeTruthy();
  });
});
