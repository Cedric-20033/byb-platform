// @vitest-environment jsdom
// src/components/admin/CreateAppointmentDialog.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toIsoDate } from '@/domain/shared/IsoDate';
import { SERVICE_ID, SUB_SERVICE_ID, buildServices } from '@/test/fixtures/buildAppointmentListItem';

// La lecture des créneaux passe par une Server Action : doublure, pour ne pas charger le code serveur.
const getAvailableSlotsAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/actions/booking/getAvailableSlots', () => ({ getAvailableSlotsAction }));

const granted = vi.hoisted(() => ({ rights: new Set<string>() }));
vi.mock('@/components/admin/PermissionsProvider', () => ({
  usePermissions: () => ({
    role: 'admin',
    isSuperadmin: false,
    can: (domain: string, action: string) => granted.rights.has(`${domain}.${action}`),
  }),
}));

import { CreateAppointmentDialog } from './CreateAppointmentDialog';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
const t = messages.admin.appointments.create;

const SLOT = { id: 'slot-1', date: toIsoDate(new Date()), startTime: '09:00:00', endTime: '10:00:00', serviceId: SERVICE_ID };

function renderDialog(onSubmit = vi.fn().mockResolvedValue(undefined), onOpenChange = vi.fn()) {
  const archived = { ...buildServices()[0], id: 'archived-id', isActive: false, name: { fr: 'Service archivé' } };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fr" messages={messages}>
        <CreateAppointmentDialog
          open
          onOpenChange={onOpenChange}
          services={[...buildServices(), archived]}
          locale="fr"
          onSubmit={onSubmit}
        />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { onSubmit, onOpenChange };
}

const submitButton = () => screen.getByRole('button', { name: t.submit }) as HTMLButtonElement;

async function fillClient(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(t.name), 'Alice Martin');
  await user.type(screen.getByLabelText(t.email), 'alice@example.com');
  await user.type(screen.getByLabelText(t.phone), '+32 470 12 34 56');
}

beforeEach(() => {
  granted.rights = new Set(['appointments.create']);
  getAvailableSlotsAction.mockReset();
  getAvailableSlotsAction.mockResolvedValue({ success: true, slots: [SLOT] });
});

describe('CreateAppointmentDialog', () => {
  it('ne propose que les services actifs', () => {
    renderDialog();

    expect(screen.getByRole('option', { name: 'Toiture' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Service archivé' })).toBeNull();
  });

  it('reste inactif tant qu\'aucun service ni créneau n\'est choisi', async () => {
    renderDialog();
    expect(submitButton().disabled).toBe(true);

    await userEvent.setup().selectOptions(screen.getByLabelText(t.service), SERVICE_ID);

    // Service choisi mais pas de créneau : toujours inactif.
    expect(submitButton().disabled).toBe(true);
  });

  it('invite à choisir un service avant d\'afficher des créneaux', () => {
    renderDialog();

    expect(screen.getByText(t.pickService)).toBeTruthy();
    expect(getAvailableSlotsAction).not.toHaveBeenCalled();
  });

  it('envoie le service, la sous-prestation, le créneau libre et les coordonnées du client', async () => {
    const { onSubmit, onOpenChange } = renderDialog();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(t.service), SERVICE_ID);
    await user.selectOptions(screen.getByLabelText(t.subService), SUB_SERVICE_ID);
    await user.click(await screen.findByRole('button', { name: /09:00/ }));
    await fillClient(user);
    await user.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: SERVICE_ID,
        subServiceId: SUB_SERVICE_ID,
        slot: { kind: 'existing', slotId: 'slot-1' },
        clientName: 'Alice Martin',
        clientEmail: 'alice@example.com',
        clientPhone: '+32 470 12 34 56',
      }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('affiche une erreur de validation traduite et n\'envoie rien si le client est invalide', async () => {
    const { onSubmit } = renderDialog();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(t.service), SERVICE_ID);
    await user.click(await screen.findByRole('button', { name: /09:00/ }));
    await user.type(screen.getByLabelText(t.name), 'Alice Martin');
    await user.type(screen.getByLabelText(t.email), 'pas-un-email');
    await user.type(screen.getByLabelText(t.phone), '+32 470 12 34 56');
    await user.click(submitButton());

    expect(await screen.findByText(messages.errors.validation.emailInvalid)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('garde la modale ouverte et la saisie quand l\'envoi échoue', async () => {
    const { onSubmit, onOpenChange } = renderDialog(vi.fn().mockRejectedValue(new Error('refusé')));
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(t.service), SERVICE_ID);
    await user.click(await screen.findByRole('button', { name: /09:00/ }));
    await fillClient(user);
    await user.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect((screen.getByLabelText(t.name) as HTMLInputElement).value).toBe('Alice Martin');
  });

  describe('créneau ponctuel', () => {
    it('n\'est pas proposé sans le droit slots.create', () => {
      renderDialog();

      expect(screen.queryByLabelText(t.modeAdHoc)).toBeNull();
    });

    it('envoie une date et des horaires quand l\'admin peut créer des créneaux', async () => {
      granted.rights.add('slots.create');
      const { onSubmit } = renderDialog();
      const user = userEvent.setup();

      await user.click(screen.getByLabelText(t.modeAdHoc));
      await user.selectOptions(screen.getByLabelText(t.service), SERVICE_ID);
      // Les champs « time » se pilotent par un évènement change : la saisie clavier y est peu fiable sous jsdom.
      fireEvent.change(screen.getByLabelText(t.startTime), { target: { value: '08:30' } });
      fireEvent.change(screen.getByLabelText(t.endTime), { target: { value: '09:15' } });
      await fillClient(user);
      await user.click(submitButton());

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ slot: { kind: 'adHoc', date: SLOT.date, startTime: '08:30', endTime: '09:15' } }),
      );
      // Aucun créneau libre n'est interrogé en mode ponctuel.
      expect(getAvailableSlotsAction).not.toHaveBeenCalled();
    });

    it('reste inactif tant que la fin ne suit pas le début', async () => {
      granted.rights.add('slots.create');
      renderDialog();
      const user = userEvent.setup();

      await user.selectOptions(screen.getByLabelText(t.service), SERVICE_ID);
      await user.click(screen.getByLabelText(t.modeAdHoc));
      fireEvent.change(screen.getByLabelText(t.startTime), { target: { value: '10:00' } });
      fireEvent.change(screen.getByLabelText(t.endTime), { target: { value: '09:00' } });

      expect(submitButton().disabled).toBe(true);
    });
  });
});
