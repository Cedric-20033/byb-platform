// src/application/acceptance.test.ts
// Critères d'acceptation du cahier des charges (§8), rejoués de bout en bout au niveau applicatif :
// les vrais use cases, câblés ensemble sur des dépôts en mémoire, déroulent le parcours d'un client puis
// celui de l'équipe. Les assertions d'emails (CA3) vivent ici, car l'E2E navigateur ne peut pas lire une boîte
// de réception : l'envoi réel est vérifié en recette (P11.3, P11.8).
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole } from '@/domain/shared/AuditLogger';
import { EmailType } from '@/domain/shared/EmailProvider';
import { ConfirmAppointment } from '@/application/admin/ConfirmAppointment';
import { ExportAppointments } from '@/application/admin/ExportAppointments';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { CancelAppointmentByClient } from '@/application/booking/CancelAppointmentByClient';
import { CreateAppointment, type CreateAppointmentInput } from '@/application/booking/CreateAppointment';
import { GetAvailableSlots } from '@/application/booking/GetAvailableSlots';
import { GetClientAppointment } from '@/application/booking/GetClientAppointment';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { FixedClock } from '@/test/fakes/FixedClock';
import { InMemoryClientAppointmentAccess } from '@/test/fakes/InMemoryClientAppointmentAccess';
import { InMemoryHolidayRepository } from '@/test/fakes/InMemoryHolidayRepository';
import { SERVICE, buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';

/** 15 octobre 2026, 10:00 à Bruxelles. */
const NOW = '2026-10-15T10:00:00+02:00';
const TEAM_EMAIL = 'equipe@byb.test';
const POLICY = { minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 3 };
const admin = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

/** Le site tel que le câblent les Server Actions : mêmes use cases, dépôts en mémoire. */
function buildSite() {
  const world = buildAppointmentWorld([slot('nine', '2026-10-20', '09:00', '10:00'), slot('ten', '2026-10-20', '10:00', '11:00')]);
  const emailProvider = new FakeEmailProvider();
  const auditLogger = new FakeAuditLogger();
  const clock = FixedClock.at(NOW);
  const access = new InMemoryClientAppointmentAccess(world.appointmentRepository, world.slotRepository);

  const cancel = new CancelAppointment(world.appointmentRepository, world.slotRepository, emailProvider, auditLogger);
  const createAppointment = new CreateAppointment(
    world.appointmentRepository,
    world.slotRepository,
    emailProvider,
    auditLogger,
    TEAM_EMAIL,
    POLICY,
    clock,
  );

  return {
    ...world,
    emailProvider,
    auditLogger,
    access,
    cancel,
    book: (slotId: string, overrides: Partial<CreateAppointmentInput> = {}) =>
      createAppointment.execute({
        slotId,
        serviceId: SERVICE,
        clientName: 'Alice Martin',
        clientEmail: 'alice@example.com',
        clientPhone: '+32 470 12 34 56',
        ...overrides,
      }),
    availableSlotIds: async () =>
      (
        await new GetAvailableSlots(world.slotRepository, new InMemoryHolidayRepository()).execute({
          serviceId: SERVICE,
          from: '2026-10-15',
          to: '2026-10-31',
        })
      ).map((found) => found.id),
    cancelByClient: new CancelAppointmentByClient(new GetClientAppointment(access, clock), cancel, emailProvider, TEAM_EMAIL),
    confirm: new ConfirmAppointment(world.appointmentRepository, emailProvider, auditLogger),
    exporter: new ExportAppointments(world.appointmentRepository, auditLogger),
  };
}

describe('CA1 : le client peut réserver un créneau disponible (UC-01)', () => {
  it('le créneau est proposé, puis réservé : un rendez-vous en attente existe', async () => {
    const site = buildSite();
    expect(await site.availableSlotIds()).toContain('nine');

    const appointment = await site.book('nine');

    expect(appointment.status).toBe(AppointmentStatus.PENDING);
    expect((await site.slotRepository.findById('nine'))?.status).toBe(SlotStatus.BOOKED);
    expect(await site.appointmentRepository.findById(appointment.id)).not.toBeNull();
  });
});

describe('CA2 : les créneaux occupés ne sont pas sélectionnables', () => {
  it('un créneau réservé disparaît des disponibilités, les autres restent proposés', async () => {
    const site = buildSite();

    await site.book('nine');

    expect(await site.availableSlotIds()).toEqual(['ten']);
  });

  it('un second client ne peut pas prendre le créneau déjà réservé', async () => {
    const site = buildSite();
    await site.book('nine');

    await expect(site.book('nine', { clientName: 'Bob', clientEmail: 'bob@example.com' })).rejects.toMatchObject({
      code: 'SLOT_UNAVAILABLE',
    });

    expect(site.appointmentRepository.all()).toHaveLength(1);
  });
});

describe('CA3 : les emails sont envoyés automatiquement', () => {
  it('toute la vie d\'un rendez-vous déclenche les bons emails, au bon destinataire, dans l\'ordre', async () => {
    const site = buildSite();

    const appointment = await site.book('nine');
    await site.confirm.execute({ appointmentId: appointment.id, ...admin });
    await site.cancelByClient.execute({ token: site.access.issueToken(appointment.id) });

    expect(site.emailProvider.sent.map(({ to, type }) => ({ to, type }))).toEqual([
      { to: 'alice@example.com', type: EmailType.APPOINTMENT_CONFIRMATION },
      { to: TEAM_EMAIL, type: EmailType.ADMIN_NEW_APPOINTMENT },
      { to: 'alice@example.com', type: EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN },
      { to: 'alice@example.com', type: EmailType.APPOINTMENT_CANCELLATION },
      { to: TEAM_EMAIL, type: EmailType.ADMIN_APPOINTMENT_CANCELLED_BY_CLIENT },
    ]);
  });
});

describe('CA4 : l\'annulation libère le créneau (UC-02)', () => {
  it('le client annule par son lien : le créneau redevient réservable, y compris par quelqu\'un d\'autre', async () => {
    const site = buildSite();
    const appointment = await site.book('nine');
    expect(await site.availableSlotIds()).not.toContain('nine');

    await site.cancelByClient.execute({ token: site.access.issueToken(appointment.id) });

    expect((await site.appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CANCELLED);
    expect(await site.availableSlotIds()).toContain('nine');
    const rebooked = await site.book('nine', { clientName: 'Bob', clientEmail: 'bob@example.com' });
    expect(rebooked.status).toBe(AppointmentStatus.PENDING);
  });
});

describe('CA5 : l\'administrateur peut gérer l\'ensemble des rendez-vous (UC-03)', () => {
  it('confirme, annule et exporte le planning, chaque action étant tracée', async () => {
    const site = buildSite();
    const first = await site.book('nine');
    const second = await site.book('ten', { clientName: 'Bob Dupont', clientEmail: 'bob@example.com' });

    await site.confirm.execute({ appointmentId: first.id, ...admin });
    await site.cancel.execute({ appointmentId: second.id, reason: 'Imprévu', ...admin });
    const rows = await site.exporter.execute({ filters: {}, ...admin });

    expect(Object.fromEntries(rows.map((row) => [row.clientName, row.status]))).toEqual({
      'Alice Martin': AppointmentStatus.CONFIRMED,
      'Bob Dupont': AppointmentStatus.CANCELLED,
    });
    // Le créneau du rendez-vous annulé est libre, celui du rendez-vous confirmé reste pris.
    expect(await site.availableSlotIds()).toEqual(['ten']);
    expect(site.auditLogger.entries.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'EXPORT_GENERATED']),
    );
  });
});
