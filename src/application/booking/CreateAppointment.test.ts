// src/application/booking/CreateAppointment.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import type { DomainError } from '@/domain/shared/DomainError';
import { EmailType } from '@/domain/shared/EmailProvider';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { FixedClock } from '@/test/fakes/FixedClock';
import { OTHER_SERVICE, SERVICE, buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { CreateAppointment, type CreateAppointmentInput } from './CreateAppointment';

/** 15 octobre 2026, 10:00 à Bruxelles. */
const NOW = '2026-10-15T10:00:00+02:00';
const ADMIN_EMAIL = 'equipe@byb.test';

function setup(policy = { minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 3 }) {
  const world = buildAppointmentWorld([
    slot('a', '2026-10-20', '09:00', '10:00'),
    slot('b', '2026-10-21', '09:00', '10:00'),
    slot('c', '2026-10-22', '09:00', '10:00'),
    slot('soon', '2026-10-15', '11:00', '12:00'),
    slot('past', '2026-10-14', '09:00', '10:00'),
    slot('far', '2027-03-01', '09:00', '10:00'),
    slot('taken', '2026-10-23', '09:00', '10:00', SlotStatus.BOOKED),
    slot('other', '2026-10-24', '09:00', '10:00', SlotStatus.AVAILABLE, OTHER_SERVICE),
  ]);
  const emailProvider = new FakeEmailProvider();
  const auditLogger = new FakeAuditLogger();
  const useCase = new CreateAppointment(
    world.appointmentRepository,
    world.slotRepository,
    emailProvider,
    auditLogger,
    ADMIN_EMAIL,
    policy,
    FixedClock.at(NOW),
  );
  const book = (slotId: string, overrides: Partial<CreateAppointmentInput> = {}) =>
    useCase.execute({
      slotId,
      serviceId: SERVICE,
      clientName: 'Alice Martin',
      clientEmail: 'alice@example.com',
      clientPhone: '+32 470 12 34 56',
      ...overrides,
    });
  return { ...world, emailProvider, auditLogger, book };
}

const expectCode = (promise: Promise<unknown>, code: DomainError['code']) => expect(promise).rejects.toMatchObject({ code });

describe('CreateAppointment', () => {
  it('crée un rendez-vous en attente et réserve le créneau', async () => {
    const { book, slotRepository, appointmentRepository } = setup();

    const appointment = await book('a');

    expect(appointment.status).toBe(AppointmentStatus.PENDING);
    expect(await appointmentRepository.findById(appointment.id)).not.toBeNull();
    expect((await slotRepository.findById('a'))?.status).toBe(SlotStatus.BOOKED);
  });

  it('prévient le client puis l\'équipe', async () => {
    const { book, emailProvider } = setup();

    await book('a');

    expect(emailProvider.sent.map(({ to, type }) => ({ to, type }))).toEqual([
      { to: 'alice@example.com', type: EmailType.APPOINTMENT_CONFIRMATION },
      { to: ADMIN_EMAIL, type: EmailType.ADMIN_NEW_APPOINTMENT },
    ]);
  });

  it('trace la création avec l\'acteur « client »', async () => {
    const { book, auditLogger } = setup();

    const appointment = await book('a');

    expect(auditLogger.entries).toEqual([
      {
        actorId: null,
        actorRole: ActorRole.CLIENT,
        action: AuditAction.APPOINTMENT_CREATED,
        targetType: 'appointment',
        targetId: appointment.id,
      },
    ]);
  });

  it('mémorise la langue du visiteur, français par défaut', async () => {
    const { book } = setup();

    expect((await book('a', { locale: 'de' })).locale).toBe('de');
    expect((await book('b')).locale).toBe('fr');
  });

  it('enregistre l\'email en minuscules', async () => {
    const { book } = setup();

    expect((await book('a', { clientEmail: '  Alice@Example.COM ' })).clientEmail).toBe('alice@example.com');
  });

  describe('créneau', () => {
    it('refuse un créneau inconnu ou déjà pris', async () => {
      const { book } = setup();

      await expectCode(book('inconnu'), 'SLOT_NOT_FOUND');
      await expectCode(book('taken'), 'SLOT_UNAVAILABLE');
    });

    it('refuse le créneau d\'un autre service que celui déclaré', async () => {
      const { book } = setup();

      await expectCode(book('other'), 'SLOT_UNAVAILABLE');
      await expectCode(book('a', { serviceId: OTHER_SERVICE }), 'SLOT_UNAVAILABLE');
    });

    it('refuse un créneau passé, trop proche ou trop lointain', async () => {
      const { book } = setup();

      await expectCode(book('past'), 'SLOT_IN_PAST');
      await expectCode(book('soon'), 'SLOT_TOO_SOON');
      await expectCode(book('far'), 'SLOT_TOO_FAR');
    });
  });

  describe('plafond de rendez-vous à venir par adresse', () => {
    it('refuse au-delà du plafond, quelle que soit la casse de l\'email', async () => {
      const { book } = setup({ minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 2 });
      await book('a');
      await book('b', { clientEmail: 'ALICE@example.com' });

      await expectCode(book('c'), 'BOOKING_LIMIT_REACHED');
    });

    it('ne compte pas les rendez-vous annulés', async () => {
      const { book, appointmentRepository } = setup({ minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 1 });
      const first = await book('a');
      await appointmentRepository.updateStatus(first.id, AppointmentStatus.CANCELLED);

      await expect(book('b')).resolves.toBeDefined();
    });

    it('ne compte pas les rendez-vous d\'une autre adresse', async () => {
      const { book } = setup({ minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 1 });
      await book('a');

      await expect(book('b', { clientEmail: 'bob@example.com' })).resolves.toBeDefined();
    });
  });

  it('ne modifie, n\'envoie et ne trace rien quand la réservation est refusée', async () => {
    const { book, slotRepository, appointmentRepository, emailProvider, auditLogger } = setup();

    await expect(book('soon')).rejects.toThrow();

    expect((await slotRepository.findById('soon'))?.status).toBe(SlotStatus.AVAILABLE);
    expect(appointmentRepository.all()).toEqual([]);
    expect(emailProvider.sent).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });
});
