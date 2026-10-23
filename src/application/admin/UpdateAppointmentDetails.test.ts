// src/application/admin/UpdateAppointmentDetails.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { UpdateAppointmentDetails } from './UpdateAppointmentDetails';

function setup() {
  const world = buildAppointmentWorld([slot('s1', '2026-10-20', '09:00', '10:00', SlotStatus.BOOKED)]);
  const auditLogger = new FakeAuditLogger();
  const useCase = new UpdateAppointmentDetails(world.appointmentRepository, auditLogger);
  const same = { clientName: 'Alice Martin', clientEmail: 'alice@example.com', clientPhone: '+32 470 12 34 56', notes: 'Prévoir une échelle' };
  const run = (appointmentId: string, changes: Partial<typeof same>) =>
    useCase.execute({ appointmentId, ...same, ...changes, actorId: 'admin-1', actorRole: ActorRole.ADMIN });
  return { ...world, auditLogger, run };
}

describe('UpdateAppointmentDetails', () => {
  it('met à jour les champs modifiés', async () => {
    const { run, seedAppointment, appointmentRepository } = setup();
    const appointment = await seedAppointment('s1');

    await run(appointment.id, { clientName: 'Alice Dupont', notes: 'Accès par le garage' });

    expect(await appointmentRepository.findById(appointment.id)).toMatchObject({
      clientName: 'Alice Dupont',
      notes: 'Accès par le garage',
      clientEmail: 'alice@example.com',
    });
  });

  it('trace uniquement les NOMS des champs modifiés, jamais leurs valeurs', async () => {
    const { run, seedAppointment, auditLogger } = setup();
    const appointment = await seedAppointment('s1');

    await run(appointment.id, { clientName: 'Alice Dupont', clientPhone: '+32 499 00 00 00' });

    expect(auditLogger.entries).toEqual([
      {
        actorId: 'admin-1',
        actorRole: ActorRole.ADMIN,
        action: AuditAction.APPOINTMENT_UPDATED,
        targetType: 'appointment',
        targetId: appointment.id,
        metadata: { changedFields: ['clientName', 'clientPhone'] },
      },
    ]);
    expect(JSON.stringify(auditLogger.entries)).not.toContain('Dupont');
  });

  it('ne fait rien et ne trace rien quand rien ne change', async () => {
    const { run, seedAppointment, auditLogger } = setup();
    const appointment = await seedAppointment('s1');

    await run(appointment.id, {});

    expect(auditLogger.entries).toEqual([]);
  });

  it('ignore les espaces de bord et traite une note vide comme une absence de note', async () => {
    const { run, seedAppointment, auditLogger, appointmentRepository } = setup();
    const appointment = await seedAppointment('s1', { notes: null });

    await run(appointment.id, { clientName: '  Alice Martin  ', notes: '   ' });

    expect(auditLogger.entries).toEqual([]);
    expect((await appointmentRepository.findById(appointment.id))?.notes).toBeNull();
  });

  it('refuse un rendez-vous inconnu ou annulé', async () => {
    const { run, seedAppointment } = setup();
    const cancelled = await seedAppointment('s1', { status: AppointmentStatus.CANCELLED });

    await expect(run('inconnu', {})).rejects.toMatchObject({ code: 'APPOINTMENT_NOT_FOUND' });
    await expect(run(cancelled.id, { clientName: 'Autre' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
  });
});
