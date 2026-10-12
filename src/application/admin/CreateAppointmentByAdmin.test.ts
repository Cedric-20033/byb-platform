// src/application/admin/CreateAppointmentByAdmin.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import type { SlotSelection } from '@/domain/appointment/AdminAppointmentBooker';
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { EmailType } from '@/domain/shared/EmailProvider';
import { TimeRange } from '@/domain/shared/TimeRange';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { FixedClock } from '@/test/fakes/FixedClock';
import { InMemoryAdminAppointmentBooker } from '@/test/fakes/InMemoryAdminAppointmentBooker';
import { InMemoryAppointmentRepository } from '@/test/fakes/InMemoryAppointmentRepository';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { CreateAppointmentByAdmin, type CreateAppointmentByAdminInput } from './CreateAppointmentByAdmin';

const SERVICE = 'service-toiture';
const OTHER_SERVICE = 'service-bardage';
const ACTOR_ID = 'admin-1';

/** 15 octobre 2026, 10 h à Bruxelles : « aujourd'hui » vaut donc 2026-10-15. */
const NOW = '2026-10-15T10:00:00+02:00';

// Les créneaux viennent de la base au format « HH:mm:ss » : les fixtures le reproduisent.
const slot = (id: string, date: string, start: string, end: string, status = SlotStatus.AVAILABLE, serviceId = SERVICE) =>
  new Slot(id, date, new TimeRange(`${start}:00`, `${end}:00`), status, serviceId);

function setup(slots: Slot[] = []) {
  const slotRepository = new InMemorySlotRepository(slots);
  const appointmentRepository = new InMemoryAppointmentRepository(slotRepository);
  const emailProvider = new FakeEmailProvider();
  const auditLogger = new FakeAuditLogger();
  const useCase = new CreateAppointmentByAdmin(
    new InMemoryAdminAppointmentBooker(slotRepository, appointmentRepository),
    slotRepository,
    emailProvider,
    auditLogger,
    FixedClock.at(NOW),
  );
  return { useCase, slotRepository, appointmentRepository, emailProvider, auditLogger };
}

const input = (slotSelection: SlotSelection, overrides: Partial<CreateAppointmentByAdminInput> = {}): CreateAppointmentByAdminInput => ({
  serviceId: SERVICE,
  slot: slotSelection,
  clientName: 'Alice Martin',
  clientEmail: 'alice@example.com',
  clientPhone: '+32 470 12 34 56',
  notes: 'Appel téléphonique',
  actorId: ACTOR_ID,
  actorRole: ActorRole.SUPERADMIN,
  ...overrides,
});

const adHoc = (date: string, startTime: string, endTime: string): SlotSelection => ({ kind: 'adHoc', date, startTime, endTime });

async function expectDomainError(promise: Promise<unknown>, code: DomainError['code']) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('CreateAppointmentByAdmin', () => {
  describe('avec un créneau libre existant', () => {
    let context: ReturnType<typeof setup>;

    beforeEach(() => {
      context = setup([slot('slot-1', '2026-10-20', '09:00', '10:00')]);
    });

    it('crée un rendez-vous confirmé d\'office et réserve le créneau', async () => {
      const appointment = await context.useCase.execute(input({ kind: 'existing', slotId: 'slot-1' }));

      expect(appointment.status).toBe(AppointmentStatus.CONFIRMED);
      expect(appointment.slotId).toBe('slot-1');
      expect((await context.slotRepository.findById('slot-1'))?.status).toBe(SlotStatus.BOOKED);
      expect(context.appointmentRepository.all()).toHaveLength(1);
    });

    it('envoie l\'email de confirmation au client', async () => {
      await context.useCase.execute(input({ kind: 'existing', slotId: 'slot-1' }));

      expect(context.emailProvider.sent).toHaveLength(1);
      expect(context.emailProvider.sent[0]).toMatchObject({
        to: 'alice@example.com',
        type: EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN,
      });
    });

    it('trace l\'action avec l\'auteur et le créneau, sans donnée personnelle du client', async () => {
      const appointment = await context.useCase.execute(input({ kind: 'existing', slotId: 'slot-1' }));

      expect(context.auditLogger.entries).toEqual([
        {
          actorId: ACTOR_ID,
          actorRole: ActorRole.SUPERADMIN,
          action: AuditAction.APPOINTMENT_CREATED_BY_ADMIN,
          targetType: 'appointment',
          targetId: appointment.id,
          metadata: { adHocSlot: false, slotDate: '2026-10-20', slotStartTime: '09:00:00', slotEndTime: '10:00:00' },
        },
      ]);
    });

    it('refuse un créneau inconnu', async () => {
      await expectDomainError(context.useCase.execute(input({ kind: 'existing', slotId: 'inconnu' })), 'SLOT_NOT_FOUND');
    });

    it('refuse un créneau déjà réservé ou bloqué', async () => {
      const taken = setup([
        slot('booked', '2026-10-20', '09:00', '10:00', SlotStatus.BOOKED),
        slot('blocked', '2026-10-20', '10:00', '11:00', SlotStatus.BLOCKED),
      ]);

      await expectDomainError(taken.useCase.execute(input({ kind: 'existing', slotId: 'booked' })), 'SLOT_UNAVAILABLE');
      await expectDomainError(taken.useCase.execute(input({ kind: 'existing', slotId: 'blocked' })), 'SLOT_UNAVAILABLE');
    });

    it('refuse le créneau d\'un autre service', async () => {
      const other = setup([slot('slot-2', '2026-10-20', '09:00', '10:00', SlotStatus.AVAILABLE, OTHER_SERVICE)]);

      await expectDomainError(other.useCase.execute(input({ kind: 'existing', slotId: 'slot-2' })), 'SLOT_UNAVAILABLE');
    });

    it('refuse un créneau dont la date est passée', async () => {
      const past = setup([slot('old', '2026-10-14', '09:00', '10:00')]);

      await expectDomainError(past.useCase.execute(input({ kind: 'existing', slotId: 'old' })), 'SLOT_IN_PAST');
    });

    it('accepte un créneau d\'aujourd\'hui', async () => {
      const today = setup([slot('today', '2026-10-15', '14:00', '15:00')]);

      await expect(today.useCase.execute(input({ kind: 'existing', slotId: 'today' }))).resolves.toBeDefined();
    });

    it('n\'envoie aucun email ni n\'écrit d\'audit quand la réservation échoue', async () => {
      await expect(context.useCase.execute(input({ kind: 'existing', slotId: 'inconnu' }))).rejects.toThrow();

      expect(context.emailProvider.sent).toEqual([]);
      expect(context.auditLogger.entries).toEqual([]);
    });
  });

  describe('avec un créneau ponctuel', () => {
    it('crée le créneau déjà réservé et le rendez-vous confirmé', async () => {
      const { useCase, slotRepository, appointmentRepository } = setup();

      const appointment = await useCase.execute(input(adHoc('2026-10-20', '08:30', '09:15')));

      const created = await slotRepository.findById(appointment.slotId);
      expect(created).toMatchObject({ date: '2026-10-20', status: SlotStatus.BOOKED, serviceId: SERVICE });
      expect(created?.range).toMatchObject({ startTime: '08:30', endTime: '09:15' });
      expect(appointmentRepository.all()[0].status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('signale le créneau ponctuel dans l\'audit', async () => {
      const { useCase, auditLogger } = setup();

      await useCase.execute(input(adHoc('2026-10-20', '08:30', '09:15')));

      expect(auditLogger.entries[0].metadata).toMatchObject({ adHocSlot: true, slotStartTime: '08:30', slotEndTime: '09:15' });
    });

    it('refuse une date passée', async () => {
      const { useCase } = setup();

      await expectDomainError(useCase.execute(input(adHoc('2026-10-14', '09:00', '10:00'))), 'SLOT_IN_PAST');
    });

    it('refuse une plage qui chevauche un créneau libre ou réservé du même service', async () => {
      const { useCase } = setup([
        slot('free', '2026-10-20', '09:00', '10:00'),
        slot('taken', '2026-10-20', '14:00', '15:00', SlotStatus.BOOKED),
      ]);

      await expectDomainError(useCase.execute(input(adHoc('2026-10-20', '09:30', '10:30'))), 'SLOT_OVERLAP');
      await expectDomainError(useCase.execute(input(adHoc('2026-10-20', '13:00', '16:00'))), 'SLOT_OVERLAP');
    });

    it('accepte une plage simplement contiguë à un créneau existant (HH:mm face à HH:mm:ss)', async () => {
      const { useCase } = setup([slot('morning', '2026-10-20', '09:00', '10:00')]);

      // 10:00 → 11:00 touche le créneau de 9 h sans le recouvrir ; le piège est la comparaison « 10:00 » < « 10:00:00 ».
      await expect(useCase.execute(input(adHoc('2026-10-20', '10:00', '11:00')))).resolves.toBeDefined();
    });

    it('accepte une plage qui recouvre seulement un créneau d\'un autre service ou un créneau bloqué', async () => {
      const { useCase } = setup([
        slot('other', '2026-10-20', '09:00', '10:00', SlotStatus.AVAILABLE, OTHER_SERVICE),
        slot('blocked', '2026-10-20', '11:00', '12:00', SlotStatus.BLOCKED),
      ]);

      await expect(useCase.execute(input(adHoc('2026-10-20', '09:00', '10:00')))).resolves.toBeDefined();
      await expect(useCase.execute(input(adHoc('2026-10-20', '11:00', '12:00')))).resolves.toBeDefined();
    });
  });
});
