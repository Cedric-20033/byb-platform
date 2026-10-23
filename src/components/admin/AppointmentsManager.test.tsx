// @vitest-environment jsdom
// src/components/admin/AppointmentsManager.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APPOINTMENT_ID, buildAppointmentListItem, buildServices } from '@/test/fixtures/buildAppointmentListItem';

// Les Server Actions importent du code serveur (cookies, Supabase) : on les remplace par des doublures.
const actions = vi.hoisted(() => ({
  listAppointmentsAction: vi.fn(),
  confirmAppointmentAction: vi.fn(),
  cancelAppointmentAction: vi.fn(),
  listAppointmentHistoryAction: vi.fn(),
  createAppointmentByAdminAction: vi.fn(),
  deleteAppointmentAction: vi.fn(),
  rescheduleAppointmentAction: vi.fn(),
  updateAppointmentDetailsAction: vi.fn(),
}));
vi.mock('@/app/actions/admin/appointments', () => actions);

// Lecture publique des créneaux utilisée par le formulaire de création.
const getAvailableSlotsAction = vi.hoisted(() => vi.fn());
vi.mock('@/app/actions/booking/getAvailableSlots', () => ({ getAvailableSlotsAction }));

// L'état de la liste vit dans l'URL : on la pilote et on observe ses mises à jour.
const navigation = vi.hoisted(() => ({ replace: vi.fn(), search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => '/fr/dashboard/appointments',
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

// Ces deux composants ont leurs propres responsabilités (filtres, export) : hors sujet ici.
vi.mock('./AppointmentsFilters', () => ({ AppointmentsFilters: () => null }));
vi.mock('./ExportButtons', () => ({ ExportButtons: () => null }));

const granted = vi.hoisted(() => ({ rights: new Set<string>() }));
vi.mock('./PermissionsProvider', () => ({
  usePermissions: () => ({
    role: 'admin',
    isSuperadmin: false,
    can: (domain: string, action: string) => granted.rights.has(`${domain}.${action}`),
  }),
}));

import { AppointmentsManager } from './AppointmentsManager';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="fr" messages={messages}>
        <AppointmentsManager locale="fr" services={buildServices()} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  granted.rights = new Set(['appointments.view']);
  Object.values(actions).forEach((action) => action.mockReset());
  navigation.search = '';
  navigation.replace.mockReset();
  actions.listAppointmentsAction.mockResolvedValue({
    success: true,
    appointments: [buildAppointmentListItem()],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  actions.listAppointmentHistoryAction.mockResolvedValue({ success: true, entries: [] });
});

describe('AppointmentsManager — permissions', () => {
  it('masque Confirmer et Annuler sans le droit appointments.edit', async () => {
    renderManager();

    await screen.findByText('alice@example.com');
    expect(screen.queryByRole('button', { name: messages.admin.appointments.confirm })).toBeNull();
    expect(screen.queryByRole('button', { name: messages.admin.appointments.cancel })).toBeNull();
  });

  it('affiche Confirmer et Annuler avec le droit appointments.edit', async () => {
    granted.rights.add('appointments.edit');
    renderManager();

    expect(await screen.findByRole('button', { name: messages.admin.appointments.confirm })).toBeTruthy();
    expect(screen.getByRole('button', { name: messages.admin.appointments.cancel })).toBeTruthy();
  });
});

describe('AppointmentsManager — création manuelle', () => {
  const openLabel = messages.admin.appointments.create.open;

  it('masque le bouton Nouveau rendez-vous sans le droit appointments.create', async () => {
    renderManager();

    await screen.findByText('alice@example.com');
    expect(screen.queryByRole('button', { name: openLabel })).toBeNull();
  });

  it('ouvre le formulaire de création avec le droit appointments.create', async () => {
    granted.rights.add('appointments.create');
    renderManager();

    await userEvent.setup().click(await screen.findByRole('button', { name: openLabel }));

    expect(await screen.findByText(messages.admin.appointments.create.description)).toBeTruthy();
  });
});

describe('AppointmentsManager — liste', () => {
  const trans = messages.admin.appointments;

  it('affiche le total et la pagination renvoyés par le serveur', async () => {
    actions.listAppointmentsAction.mockResolvedValue({
      success: true,
      appointments: [buildAppointmentListItem()],
      total: 45,
      page: 2,
      pageSize: 20,
    });
    renderManager();

    expect(await screen.findByText('21 à 40 sur 45')).toBeTruthy();
  });

  it('envoie au serveur les filtres, la page et le tri lus dans l\u2019URL', async () => {
    navigation.search = 'q=alice&page=2&sort=clientName&dir=asc';
    renderManager();

    await screen.findByText('alice@example.com');
    expect(actions.listAppointmentsAction).toHaveBeenCalledWith({
      filters: { query: 'alice' },
      page: 2,
      sort: 'clientName',
      direction: 'asc',
    });
  });

  it('met le tri dans l\u2019URL et repart de la première page au clic sur un en-tête', async () => {
    navigation.search = 'page=3';
    renderManager();

    await userEvent.setup().click(await screen.findByRole('button', { name: `Trier par ${trans.columnClient}` }));

    expect(navigation.replace).toHaveBeenCalledWith('/fr/dashboard/appointments?sort=clientName&dir=asc', { scroll: false });
  });
});

describe('AppointmentsManager — actions de la fiche', () => {
  const open = async () => {
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Alice Martin/ }));
    await screen.findByText(messages.admin.appointments.details.title);
    return user;
  };

  it('ne propose ni modification, ni replanification, ni suppression sans les droits', async () => {
    renderManager();
    await open();

    for (const label of ['edit', 'reschedule', 'delete']) {
      expect(screen.queryByRole('button', { name: messages.admin.appointments[label].open })).toBeNull();
    }
  });

  it('propose Modifier et Replanifier avec appointments.edit', async () => {
    granted.rights.add('appointments.edit');
    renderManager();
    await open();

    expect(screen.getByRole('button', { name: messages.admin.appointments.edit.open })).toBeTruthy();
    expect(screen.getByRole('button', { name: messages.admin.appointments.reschedule.open })).toBeTruthy();
    expect(screen.queryByRole('button', { name: messages.admin.appointments.delete.open })).toBeNull();
  });

  it('propose Supprimer avec appointments.delete seul, sans Modifier', async () => {
    granted.rights.add('appointments.delete');
    renderManager();
    await open();

    expect(screen.getByRole('button', { name: messages.admin.appointments.delete.open })).toBeTruthy();
    expect(screen.queryByRole('button', { name: messages.admin.appointments.edit.open })).toBeNull();
  });

  it('ne supprime qu\u2019après la saisie du nom du client', async () => {
    granted.rights.add('appointments.delete');
    actions.deleteAppointmentAction.mockResolvedValue({ success: true });
    renderManager();
    const user = await open();

    await user.click(screen.getByRole('button', { name: messages.admin.appointments.delete.open }));
    const submit = (await screen.findByRole('button', { name: messages.admin.appointments.delete.submit })) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    // La casse n'a pas d'importance : un admin pressé ne doit pas être bloqué par une majuscule.
    await user.type(screen.getByRole('textbox'), 'alice MARTIN');
    expect(submit.disabled).toBe(false);
    await user.click(submit);

    await waitFor(() => expect(actions.deleteAppointmentAction).toHaveBeenCalledWith(APPOINTMENT_ID));
  });
});

describe('AppointmentsManager — fiche', () => {
  it('ouvre la fiche du rendez-vous au clic sur le nom du client, même sans droit d\'édition', async () => {
    renderManager();

    await userEvent.setup().click(await screen.findByRole('button', { name: /Alice Martin/ }));

    expect(await screen.findByText(messages.admin.appointments.details.title)).toBeTruthy();
    // Le lien mailto n'existe que dans la fiche (le tableau affiche l'email en texte simple).
    expect(screen.getByRole('link', { name: 'alice@example.com' })).toBeTruthy();
  });

  it('ne charge pas l\'historique sans le droit audit_logs.view', async () => {
    renderManager();

    await userEvent.setup().click(await screen.findByRole('button', { name: /Alice Martin/ }));
    await screen.findByText(messages.admin.appointments.details.title);

    expect(actions.listAppointmentHistoryAction).not.toHaveBeenCalled();
  });

  it('charge l\'historique du rendez-vous avec le droit audit_logs.view', async () => {
    granted.rights.add('audit_logs.view');
    renderManager();

    await userEvent.setup().click(await screen.findByRole('button', { name: /Alice Martin/ }));

    expect(await screen.findByText(messages.admin.appointments.details.history.empty)).toBeTruthy();
    expect(actions.listAppointmentHistoryAction).toHaveBeenCalledTimes(1);
  });
});
