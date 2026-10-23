// src/application/admin/ConfirmAppointment.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { EmailType } from '@/domain/shared/EmailProvider';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { ConfirmAppointment } from './ConfirmAppointment';

const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

async function setup(status: AppointmentStatus = AppointmentStatus.PENDING) {
  const world = buildAppointmentWorld([slot('s1', '2026-10-20', '09:00', '10:00', SlotStatus.BOOKED)]);
  const appointment = await world.seedAppointment('s1', { status, email: 'client@example.com' });
  const emailProvider = new FakeEmailProvider();
  const auditLogger = new FakeAuditLogger();
  const confirm = new ConfirmAppointment(world.appointmentRepository, emailProvider, auditLogger);
  return { ...world, appointment, emailProvider, auditLogger, confirm };
}

describe('ConfirmAppointment', () => {
  it('confirme un rendez-vous en attente', async () => {
    const { confirm, appointment, appointmentRepository } = await setup();

    await confirm.execute({ appointmentId: appointment.id, ...actor });

    expect((await appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CONFIRMED);
  });

  it('laisse le créneau réservé : il l\'est déjà depuis la création de la demande', async () => {
    const { confirm, appointment, slotRepository } = await setup();

    await confirm.execute({ appointmentId: appointment.id, ...actor });

    expect((await slotRepository.findById('s1'))?.status).toBe(SlotStatus.BOOKED);
  });

  it('prévient le client par email', async () => {
    const { confirm, appointment, emailProvider } = await setup();

    await confirm.execute({ appointmentId: appointment.id, ...actor });

    expect(emailProvider.sent).toHaveLength(1);
    expect(emailProvider.sent[0]).toMatchObject({
      to: 'client@example.com',
      type: EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN,
      data: { appointment: { id: appointment.id } },
    });
  });

  it('trace la confirmation avec l\'acteur', async () => {
    const { confirm, appointment, auditLogger } = await setup();

    await confirm.execute({ appointmentId: appointment.id, ...actor });

    expect(auditLogger.entries).toEqual([
      { ...actor, action: AuditAction.APPOINTMENT_CONFIRMED, targetType: 'appointment', targetId: appointment.id },
    ]);
  });

  it('refuse un rendez-vous introuvable', async () => {
    const { confirm, emailProvider, auditLogger } = await setup();

    await expect(confirm.execute({ appointmentId: 'missing', ...actor })).rejects.toMatchObject({
      code: 'APPOINTMENT_NOT_FOUND',
    });
    expect(emailProvider.sent).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });

  it.each([AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED])(
    'refuse un rendez-vous déjà « %s » sans email ni trace',
    async (status) => {
      const { confirm, appointment, appointmentRepository, emailProvider, auditLogger } = await setup(status);

      await expect(confirm.execute({ appointmentId: appointment.id, ...actor })).rejects.toMatchObject({
        code: 'INVALID_STATUS_TRANSITION',
      });

      expect((await appointmentRepository.findById(appointment.id))?.status).toBe(status);
      expect(emailProvider.sent).toEqual([]);
      expect(auditLogger.entries).toEqual([]);
    },
  );
});
