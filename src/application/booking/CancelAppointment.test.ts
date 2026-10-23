// src/application/booking/CancelAppointment.test.ts
// Le use case est aussi exercé indirectement par holidays.test.ts et CancelAppointmentByClient.test.ts ;
// ce fichier couvre ses règles propres : transitions, libération du créneau, email, audit, erreurs.
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { EmailType } from '@/domain/shared/EmailProvider';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { CancelAppointment } from './CancelAppointment';

const adminActor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

async function setup(status: AppointmentStatus = AppointmentStatus.CONFIRMED) {
  const world = buildAppointmentWorld([slot('s1', '2026-10-20', '09:00', '10:00', SlotStatus.BOOKED)]);
  const appointment = await world.seedAppointment('s1', { status, email: 'client@example.com' });
  const emailProvider = new FakeEmailProvider();
  const auditLogger = new FakeAuditLogger();
  const cancel = new CancelAppointment(world.appointmentRepository, world.slotRepository, emailProvider, auditLogger);
  return { ...world, appointment, emailProvider, auditLogger, cancel };
}

describe('CancelAppointment', () => {
  it.each([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])(
    'annule un rendez-vous « %s » et libère son créneau',
    async (status) => {
      const { cancel, appointment, appointmentRepository, slotRepository } = await setup(status);

      await cancel.execute({ appointmentId: appointment.id, ...adminActor });

      expect((await appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CANCELLED);
      expect((await slotRepository.findById('s1'))?.status).toBe(SlotStatus.AVAILABLE);
    },
  );

  it('prévient le client, sans motif par défaut', async () => {
    const { cancel, appointment, emailProvider } = await setup();

    await cancel.execute({ appointmentId: appointment.id, ...adminActor });

    expect(emailProvider.sent).toHaveLength(1);
    expect(emailProvider.sent[0]).toMatchObject({
      to: 'client@example.com',
      type: EmailType.APPOINTMENT_CANCELLATION,
      data: { reason: null },
    });
  });

  it('transmet le motif au client et le conserve dans le journal', async () => {
    const { cancel, appointment, emailProvider, auditLogger } = await setup();

    await cancel.execute({ appointmentId: appointment.id, reason: 'Intempéries', ...adminActor });

    expect(emailProvider.sent[0]).toMatchObject({ data: { reason: 'Intempéries' } });
    expect(auditLogger.entries[0]).toMatchObject({
      action: AuditAction.APPOINTMENT_CANCELLED,
      targetId: appointment.id,
      metadata: { reason: 'Intempéries' },
    });
  });

  it('trace une annulation faite par le client via son lien, sans identifiant d\'acteur', async () => {
    const { cancel, appointment, auditLogger } = await setup();

    await cancel.execute({ appointmentId: appointment.id, actorId: null, actorRole: ActorRole.CLIENT });

    expect(auditLogger.entries).toEqual([
      {
        actorId: null,
        actorRole: ActorRole.CLIENT,
        action: AuditAction.APPOINTMENT_CANCELLED,
        targetType: 'appointment',
        targetId: appointment.id,
        metadata: undefined,
      },
    ]);
  });

  it('refuse un rendez-vous introuvable', async () => {
    const { cancel, emailProvider, auditLogger } = await setup();

    await expect(cancel.execute({ appointmentId: 'missing', ...adminActor })).rejects.toMatchObject({
      code: 'APPOINTMENT_NOT_FOUND',
    });
    expect(emailProvider.sent).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });

  it('refuse d\'annuler deux fois, sans email ni trace', async () => {
    const { cancel, appointment, emailProvider, auditLogger } = await setup(AppointmentStatus.CANCELLED);

    await expect(cancel.execute({ appointmentId: appointment.id, ...adminActor })).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    });

    expect(emailProvider.sent).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });

  it('ne libère pas le créneau quand l\'annulation est refusée', async () => {
    const { cancel, appointment, slotRepository } = await setup(AppointmentStatus.CANCELLED);

    await expect(cancel.execute({ appointmentId: appointment.id, ...adminActor })).rejects.toBeDefined();

    // Le créneau a pu être réattribué à un autre client depuis la première annulation : on n'y touche pas.
    expect((await slotRepository.findById('s1'))?.status).toBe(SlotStatus.BOOKED);
  });
});
