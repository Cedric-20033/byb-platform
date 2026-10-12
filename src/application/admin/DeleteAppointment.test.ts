// src/application/admin/DeleteAppointment.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { DeleteAppointment } from './DeleteAppointment';

function setup(slotStatus = SlotStatus.BOOKED) {
  const world = buildAppointmentWorld([slot('s1', '2026-10-20', '09:00', '10:00', slotStatus)]);
  const auditLogger = new FakeAuditLogger();
  const useCase = new DeleteAppointment(world.appointmentRepository, world.planner, auditLogger);
  const run = (appointmentId: string) => useCase.execute({ appointmentId, actorId: 'admin-1', actorRole: ActorRole.SUPERADMIN });
  return { ...world, auditLogger, run };
}

describe('DeleteAppointment', () => {
  it.each([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])(
    'supprime un rendez-vous %s et libère son créneau',
    async (status) => {
      const { run, seedAppointment, appointmentRepository, slotRepository } = setup();
      const appointment = await seedAppointment('s1', { status });

      await run(appointment.id);

      expect(await appointmentRepository.findById(appointment.id)).toBeNull();
      expect((await slotRepository.findById('s1'))?.status).toBe(SlotStatus.AVAILABLE);
    },
  );

  it('ne touche pas au créneau d\'un rendez-vous déjà annulé (il a pu être repris par un autre client)', async () => {
    const { run, seedAppointment, appointmentRepository, slotRepository } = setup(SlotStatus.BOOKED);
    const appointment = await seedAppointment('s1', { status: AppointmentStatus.CANCELLED });

    await run(appointment.id);

    expect(await appointmentRepository.findById(appointment.id)).toBeNull();
    expect((await slotRepository.findById('s1'))?.status).toBe(SlotStatus.BOOKED);
  });

  it('trace la suppression sans donnée personnelle', async () => {
    const { run, seedAppointment, auditLogger } = setup();
    const appointment = await seedAppointment('s1', { status: AppointmentStatus.CONFIRMED });

    await run(appointment.id);

    expect(auditLogger.entries).toEqual([
      {
        actorId: 'admin-1',
        actorRole: ActorRole.SUPERADMIN,
        action: AuditAction.APPOINTMENT_DELETED,
        targetType: 'appointment',
        targetId: appointment.id,
        metadata: { status: AppointmentStatus.CONFIRMED, slotFreed: true },
      },
    ]);
    expect(JSON.stringify(auditLogger.entries)).not.toContain('alice');
  });

  it('refuse un rendez-vous inconnu et ne trace rien', async () => {
    const { run, auditLogger } = setup();

    await expect(run('inconnu')).rejects.toMatchObject({ code: 'APPOINTMENT_NOT_FOUND' });
    expect(auditLogger.entries).toEqual([]);
  });
});
