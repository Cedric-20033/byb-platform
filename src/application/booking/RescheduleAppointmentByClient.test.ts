// src/application/booking/RescheduleAppointmentByClient.test.ts
import { describe, expect, it } from 'vitest';
import { RescheduleAppointment } from '@/application/admin/RescheduleAppointment';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole } from '@/domain/shared/AuditLogger';
import type { DomainError } from '@/domain/shared/DomainError';
import { EmailType } from '@/domain/shared/EmailProvider';
import { OTHER_SERVICE, slot } from '@/test/fixtures/appointmentWorld';
import { ADMIN_EMAIL, buildClientWorld } from '@/test/fixtures/clientAppointmentWorld';
import { RescheduleAppointmentByClient } from './RescheduleAppointmentByClient';

async function setup(extraSlots = [slot('target', '2026-10-22', '14:00', '15:00')], status?: AppointmentStatus) {
  const world = await buildClientWorld(extraSlots, status);
  const useCase = new RescheduleAppointmentByClient(
    world.getClientAppointment,
    world.slotRepository,
    new RescheduleAppointment(
      world.appointmentRepository,
      world.slotRepository,
      world.planner,
      world.emailProvider,
      world.auditLogger,
      world.clock,
    ),
    world.emailProvider,
    ADMIN_EMAIL,
    { minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 3 },
    world.clock,
  );
  return { ...world, useCase };
}

const expectCode = (promise: Promise<unknown>, code: DomainError['code']) => expect(promise).rejects.toMatchObject({ code });

describe('RescheduleAppointmentByClient', () => {
  it('déplace le rendez-vous, libère l\'ancien créneau et réserve le nouveau', async () => {
    const { useCase, token, appointment, appointmentRepository, slotRepository } = await setup();

    await useCase.execute({ token, newSlotId: 'target' });

    expect((await appointmentRepository.findById(appointment.id))?.slotId).toBe('target');
    expect((await slotRepository.findById('current'))?.status).toBe(SlotStatus.AVAILABLE);
    expect((await slotRepository.findById('target'))?.status).toBe(SlotStatus.BOOKED);
  });

  it('conserve le statut : un rendez-vous confirmé le reste', async () => {
    const { useCase, token, appointment, appointmentRepository } = await setup();

    await useCase.execute({ token, newSlotId: 'target' });

    expect((await appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('prévient le client puis l\'équipe, avec l\'ancien et le nouveau créneau', async () => {
    const { useCase, token, emailProvider } = await setup();

    await useCase.execute({ token, newSlotId: 'target' });

    expect(emailProvider.sent.map(({ to, type }) => ({ to, type }))).toEqual([
      { to: 'alice@example.com', type: EmailType.APPOINTMENT_RESCHEDULED },
      { to: ADMIN_EMAIL, type: EmailType.ADMIN_APPOINTMENT_RESCHEDULED_BY_CLIENT },
    ]);
    expect(emailProvider.sent[1].data).toMatchObject({
      previousSlot: { date: '2026-10-20', startTime: '09:00:00', endTime: '10:00:00' },
      newSlot: { date: '2026-10-22', startTime: '14:00:00', endTime: '15:00:00' },
    });
  });

  it('trace le déplacement avec l\'acteur « client »', async () => {
    const { useCase, token, appointment, auditLogger } = await setup();

    await useCase.execute({ token, newSlotId: 'target' });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({ actorId: null, actorRole: ActorRole.CLIENT, targetId: appointment.id });
  });

  it('refuse un jeton inconnu', async () => {
    const { useCase } = await setup();

    await expectCode(useCase.execute({ token: 'inconnu', newSlotId: 'target' }), 'APPOINTMENT_NOT_FOUND');
  });

  it('refuse un rendez-vous annulé', async () => {
    const { useCase, token } = await setup(undefined, AppointmentStatus.CANCELLED);

    await expectCode(useCase.execute({ token, newSlotId: 'target' }), 'INVALID_STATUS_TRANSITION');
  });

  it('refuse un rendez-vous passé', async () => {
    const { useCase, token, clock } = await setup();
    clock.set('2026-10-20T09:30:00+02:00');

    await expectCode(useCase.execute({ token, newSlotId: 'target' }), 'APPOINTMENT_IN_PAST');
  });

  it('refuse un créneau inconnu, d\'un autre service ou déjà pris', async () => {
    const { useCase, token } = await setup([
      slot('other', '2026-10-22', '12:00', '13:00', SlotStatus.AVAILABLE, OTHER_SERVICE),
      slot('taken', '2026-10-22', '10:00', '11:00', SlotStatus.BOOKED),
    ]);

    await expectCode(useCase.execute({ token, newSlotId: 'inconnu' }), 'SLOT_NOT_FOUND');
    await expectCode(useCase.execute({ token, newSlotId: 'other' }), 'SLOT_UNAVAILABLE');
    await expectCode(useCase.execute({ token, newSlotId: 'taken' }), 'SLOT_UNAVAILABLE');
  });

  it('applique les règles de la réservation publique au nouveau créneau', async () => {
    const { useCase, token } = await setup([
      slot('soon', '2026-10-15', '11:00', '12:00'),
      slot('far', '2027-03-01', '09:00', '10:00'),
      slot('past', '2026-10-14', '09:00', '10:00'),
    ]);

    await expectCode(useCase.execute({ token, newSlotId: 'soon' }), 'SLOT_TOO_SOON');
    await expectCode(useCase.execute({ token, newSlotId: 'far' }), 'SLOT_TOO_FAR');
    await expectCode(useCase.execute({ token, newSlotId: 'past' }), 'SLOT_IN_PAST');
  });

  it('ne modifie, n\'envoie et ne trace rien quand le déplacement est refusé', async () => {
    const { useCase, token, slotRepository, emailProvider, auditLogger } = await setup();

    await expect(useCase.execute({ token, newSlotId: 'inconnu' })).rejects.toThrow();

    expect((await slotRepository.findById('current'))?.status).toBe(SlotStatus.BOOKED);
    expect(emailProvider.sent).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });
});
