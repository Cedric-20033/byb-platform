// src/application/admin/RescheduleAppointment.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import type { DomainError } from '@/domain/shared/DomainError';
import { EmailType } from '@/domain/shared/EmailProvider';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { FixedClock } from '@/test/fakes/FixedClock';
import { OTHER_SERVICE, buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { RescheduleAppointment } from './RescheduleAppointment';

/** 15 octobre 2026 à Bruxelles : « aujourd'hui » vaut 2026-10-15. */
const NOW = '2026-10-15T10:00:00+02:00';

function setup(extraSlots = [slot('target', '2026-10-22', '14:00', '15:00')]) {
  const world = buildAppointmentWorld([slot('current', '2026-10-20', '09:00', '10:00', SlotStatus.BOOKED), ...extraSlots]);
  const emailProvider = new FakeEmailProvider();
  const auditLogger = new FakeAuditLogger();
  const useCase = new RescheduleAppointment(
    world.appointmentRepository,
    world.slotRepository,
    world.planner,
    emailProvider,
    auditLogger,
    FixedClock.at(NOW),
  );
  const run = (appointmentId: string, newSlotId: string) =>
    useCase.execute({ appointmentId, newSlotId, actorId: 'admin-1', actorRole: ActorRole.ADMIN });
  return { ...world, emailProvider, auditLogger, run };
}

const expectCode = (promise: Promise<unknown>, code: DomainError['code']) => expect(promise).rejects.toMatchObject({ code });

describe('RescheduleAppointment', () => {
  it('déplace le rendez-vous, libère l\'ancien créneau et réserve le nouveau', async () => {
    const { run, seedAppointment, slotRepository, appointmentRepository } = setup();
    const appointment = await seedAppointment('current');

    await run(appointment.id, 'target');

    expect((await appointmentRepository.findById(appointment.id))?.slotId).toBe('target');
    expect((await slotRepository.findById('current'))?.status).toBe(SlotStatus.AVAILABLE);
    expect((await slotRepository.findById('target'))?.status).toBe(SlotStatus.BOOKED);
  });

  it('conserve le statut du rendez-vous', async () => {
    const { run, seedAppointment, appointmentRepository } = setup();
    const appointment = await seedAppointment('current', { status: AppointmentStatus.CONFIRMED });

    await run(appointment.id, 'target');

    expect((await appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('prévient le client avec l\'ancien et le nouveau créneau', async () => {
    const { run, seedAppointment, emailProvider } = setup();
    const appointment = await seedAppointment('current');

    await run(appointment.id, 'target');

    expect(emailProvider.sent).toHaveLength(1);
    expect(emailProvider.sent[0]).toMatchObject({
      to: 'alice@example.com',
      type: EmailType.APPOINTMENT_RESCHEDULED,
      data: {
        previousSlot: { date: '2026-10-20', startTime: '09:00:00', endTime: '10:00:00' },
        newSlot: { date: '2026-10-22', startTime: '14:00:00', endTime: '15:00:00' },
      },
    });
  });

  it('trace le diff avant/après sans donnée personnelle', async () => {
    const { run, seedAppointment, auditLogger } = setup();
    const appointment = await seedAppointment('current');

    await run(appointment.id, 'target');

    expect(auditLogger.entries).toEqual([
      {
        actorId: 'admin-1',
        actorRole: ActorRole.ADMIN,
        action: AuditAction.APPOINTMENT_RESCHEDULED,
        targetType: 'appointment',
        targetId: appointment.id,
        metadata: {
          slotDate: { from: '2026-10-20', to: '2026-10-22' },
          slotStartTime: { from: '09:00:00', to: '14:00:00' },
          slotEndTime: { from: '10:00:00', to: '15:00:00' },
        },
      },
    ]);
  });

  it('refuse un rendez-vous inconnu ou annulé', async () => {
    const { run, seedAppointment } = setup();
    const cancelled = await seedAppointment('current', { status: AppointmentStatus.CANCELLED });

    await expectCode(run('inconnu', 'target'), 'APPOINTMENT_NOT_FOUND');
    await expectCode(run(cancelled.id, 'target'), 'INVALID_STATUS_TRANSITION');
  });

  it('refuse un créneau inconnu, identique, déjà pris, d\'un autre service ou bloqué', async () => {
    const { run, seedAppointment } = setup([
      slot('taken', '2026-10-22', '10:00', '11:00', SlotStatus.BOOKED),
      slot('blocked', '2026-10-22', '11:00', '12:00', SlotStatus.BLOCKED),
      slot('other', '2026-10-22', '12:00', '13:00', SlotStatus.AVAILABLE, OTHER_SERVICE),
    ]);
    const appointment = await seedAppointment('current');

    await expectCode(run(appointment.id, 'inconnu'), 'SLOT_NOT_FOUND');
    for (const slotId of ['current', 'taken', 'blocked', 'other']) {
      await expectCode(run(appointment.id, slotId), 'SLOT_UNAVAILABLE');
    }
  });

  it('refuse un créneau dont la date est passée', async () => {
    const { run, seedAppointment } = setup([slot('old', '2026-10-14', '09:00', '10:00')]);
    const appointment = await seedAppointment('current');

    await expectCode(run(appointment.id, 'old'), 'SLOT_IN_PAST');
  });

  it('ne modifie rien, n\'envoie rien et ne trace rien quand le déplacement est refusé', async () => {
    const { run, seedAppointment, slotRepository, emailProvider, auditLogger } = setup();
    const appointment = await seedAppointment('current');

    await expect(run(appointment.id, 'inconnu')).rejects.toThrow();

    expect((await slotRepository.findById('current'))?.status).toBe(SlotStatus.BOOKED);
    expect(emailProvider.sent).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });
});
