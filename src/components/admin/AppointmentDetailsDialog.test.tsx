// @vitest-environment jsdom
// src/components/admin/AppointmentDetailsDialog.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { APPOINTMENT_ID, buildAppointmentListItem, buildServices } from '@/test/fixtures/buildAppointmentListItem';
import { buildAuditLogEntry } from '@/test/fixtures/buildAuditLogEntry';

// Les Server Actions importent du code serveur (cookies, Supabase) : on les remplace par une doublure.
const listAppointmentHistoryAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/actions/admin/appointments', () => ({ listAppointmentHistoryAction }));

// Droits pilotés par chaque test ; `<Can>` consomme ce même hook, il reste donc réel.
const permissions = vi.hoisted(() => ({ canViewAudit: true }));
vi.mock('@/components/admin/PermissionsProvider', () => ({
  usePermissions: () => ({
    role: 'admin',
    isSuperadmin: false,
    can: (domain: string, action: string) => domain === 'audit_logs' && action === 'view' && permissions.canViewAudit,
  }),
}));

import { AppointmentDetailsDialog } from './AppointmentDetailsDialog';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));

type DialogProps = Partial<React.ComponentProps<typeof AppointmentDetailsDialog>>;

function renderDialog(props: DialogProps = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fr" messages={messages}>
        <AppointmentDetailsDialog
          appointment={buildAppointmentListItem()}
          open
          onOpenChange={vi.fn()}
          locale="fr"
          services={buildServices()}
          {...props}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  permissions.canViewAudit = true;
  listAppointmentHistoryAction.mockReset();
  listAppointmentHistoryAction.mockResolvedValue({ success: true, entries: [] });
});

describe('AppointmentDetailsDialog', () => {
  it('affiche le client, la prestation, le créneau et les notes', () => {
    renderDialog();

    expect(screen.getByText('Alice Martin')).toBeTruthy();
    expect(screen.getByText('Toiture plate')).toBeTruthy();
    expect(screen.getByText('09:00–10:00', { exact: false })).toBeTruthy();
    expect(screen.getByText('Prévoir une échelle')).toBeTruthy();
    expect(screen.getAllByText('Toiture').length).toBeGreaterThan(0);
  });

  it('propose des liens mailto: et tel: exploitables', () => {
    renderDialog();

    expect(screen.getByRole('link', { name: 'alice@example.com' }).getAttribute('href')).toBe('mailto:alice%40example.com');
    expect(screen.getByRole('link', { name: '+32 470 12 34 56' }).getAttribute('href')).toBe('tel:+32470123456');
  });

  it('indique l\'absence de note plutôt qu\'une zone vide', () => {
    renderDialog({ appointment: buildAppointmentListItem({ notes: null }) });

    expect(screen.getByText(messages.admin.appointments.details.noNotes)).toBeTruthy();
  });

  it('retombe sur un libellé lisible quand le service est introuvable', () => {
    renderDialog({ services: [] });

    expect(screen.getAllByText(messages.admin.appointments.details.unknownService).length).toBeGreaterThan(0);
  });

  describe('historique', () => {
    it('affiche la chronologie et le motif d\'annulation avec le droit audit_logs.view', async () => {
      listAppointmentHistoryAction.mockResolvedValue({
        success: true,
        entries: [
          buildAuditLogEntry(1, {
            action: AuditAction.APPOINTMENT_CREATED,
            actorRole: ActorRole.CLIENT,
            targetType: 'appointment',
            targetId: APPOINTMENT_ID,
          }),
          buildAuditLogEntry(2, {
            action: AuditAction.APPOINTMENT_CANCELLED,
            targetType: 'appointment',
            targetId: APPOINTMENT_ID,
            metadata: { reason: 'Imprévu de chantier' },
          }),
        ],
      });
      renderDialog();

      expect(await screen.findByText(messages.admin.auditLogs.actions.APPOINTMENT_CREATED)).toBeTruthy();
      expect(screen.getByText(messages.admin.auditLogs.actions.APPOINTMENT_CANCELLED)).toBeTruthy();
      expect(screen.getByText('Motif')).toBeTruthy();
      expect(screen.getByText('Imprévu de chantier')).toBeTruthy();
      expect(listAppointmentHistoryAction).toHaveBeenCalledWith(APPOINTMENT_ID);
    });

    it('signale un historique vide', async () => {
      renderDialog();

      expect(await screen.findByText(messages.admin.appointments.details.history.empty)).toBeTruthy();
    });

    it('affiche l\'erreur traduite et permet de réessayer', async () => {
      listAppointmentHistoryAction.mockResolvedValueOnce({ success: false, error: 'FORBIDDEN' });
      renderDialog();

      expect(await screen.findByRole('alert')).toBeTruthy();

      listAppointmentHistoryAction.mockResolvedValueOnce({ success: true, entries: [] });
      await userEvent.setup().click(screen.getByRole('button', { name: messages.admin.appointments.details.history.retry }));

      expect(await screen.findByText(messages.admin.appointments.details.history.empty)).toBeTruthy();
    });

    it('n\'est ni affiché ni demandé au serveur sans le droit audit_logs.view', () => {
      permissions.canViewAudit = false;
      renderDialog();

      expect(screen.queryByText(messages.admin.appointments.details.history.title)).toBeNull();
      expect(listAppointmentHistoryAction).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    const confirmLabel = messages.admin.appointments.confirm;
    const cancelLabel = messages.admin.appointments.cancel;

    it('confirme et annule le rendez-vous en attente avec son identifiant', async () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      renderDialog({ onConfirm, onCancel });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: confirmLabel }));
      await user.click(screen.getByRole('button', { name: cancelLabel }));

      expect(onConfirm).toHaveBeenCalledWith(APPOINTMENT_ID);
      expect(onCancel).toHaveBeenCalledWith(APPOINTMENT_ID);
    });

    it('ne propose pas de confirmer un rendez-vous déjà confirmé, mais permet de l\'annuler', () => {
      renderDialog({
        appointment: buildAppointmentListItem({ status: AppointmentStatus.CONFIRMED }),
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: confirmLabel })).toBeNull();
      expect(screen.getByRole('button', { name: cancelLabel })).toBeTruthy();
    });

    it('ne propose aucune action sur un rendez-vous annulé', () => {
      renderDialog({
        appointment: buildAppointmentListItem({ status: AppointmentStatus.CANCELLED }),
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      });

      expect(screen.queryByRole('button', { name: confirmLabel })).toBeNull();
      expect(screen.queryByRole('button', { name: cancelLabel })).toBeNull();
    });

    it('masque les deux actions quand le parent ne fournit pas de callback (droit edit absent)', () => {
      renderDialog();

      expect(screen.queryByRole('button', { name: confirmLabel })).toBeNull();
      expect(screen.queryByRole('button', { name: cancelLabel })).toBeNull();
    });

    it('affiche l\'erreur de confirmation dans la fiche', () => {
      renderDialog({ onConfirm: vi.fn(), confirmError: 'Impossible de confirmer.' });

      expect(screen.getByText('Impossible de confirmer.')).toBeTruthy();
    });
  });
});
