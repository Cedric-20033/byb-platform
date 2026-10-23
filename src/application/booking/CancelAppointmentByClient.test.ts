// src/application/booking/CancelAppointmentByClient.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole } from '@/domain/shared/AuditLogger';
import { EmailType } from '@/domain/shared/EmailProvider';
import { ADMIN_EMAIL, buildCancelAppointment, buildClientWorld } from '@/test/fixtures/clientAppointmentWorld';
import { CancelAppointmentByClient } from './CancelAppointmentByClient';

async function setup(status?: AppointmentStatus) {
  const world = await buildClientWorld(undefined, status);
  const useCase = new CancelAppointmentByClient(
    world.getClientAppointment,
    buildCancelAppointment(world),
    world.emailProvider,
    ADMIN_EMAIL,
  );
  return { ...world, useCase };
}

describe('CancelAppointmentByClient', () => {
  it('annule le rendez-vous et libère le créneau', async () => {
    const { useCase, token, appointment, appointmentRepository, slotRepository } = await setup();

    await useCase.execute({ token });

    expect((await appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CANCELLED);
    expect((await slotRepository.findById('current'))?.status).toBe(SlotStatus.AVAILABLE);
  });

  it('prévient le client puis l\'équipe', async () => {
    const { useCase, token, emailProvider } = await setup();

    await useCase.execute({ token });

    expect(emailProvider.sent.map(({ to, type }) => ({ to, type }))).toEqual([
      { to: 'alice@example.com', type: EmailType.APPOINTMENT_CANCELLATION },
      { to: ADMIN_EMAIL, type: EmailType.ADMIN_APPOINTMENT_CANCELLED_BY_CLIENT },
    ]);
  });

  it('trace l\'annulation avec l\'acteur « client », sans le jeton', async () => {
    const { useCase, token, appointment, auditLogger } = await setup();

    await useCase.execute({ token });

    expect(auditLogger.entries).toHaveLength(1);
    expect(auditLogger.entries[0]).toMatchObject({ actorId: null, actorRole: ActorRole.CLIENT, targetId: appointment.id });
    expect(JSON.stringify(auditLogger.entries)).not.toContain(token);
  });

  it('refuse un jeton inconnu', async () => {
    const { useCase } = await setup();

    await expect(useCase.execute({ token: 'inconnu' })).rejects.toMatchObject({ code: 'APPOINTMENT_NOT_FOUND' });
  });

  it('refuse un rendez-vous déjà annulé', async () => {
    const { useCase, token } = await setup(AppointmentStatus.CANCELLED);

    await expect(useCase.execute({ token })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
  });

  it('refuse un rendez-vous passé', async () => {
    const { useCase, token, clock } = await setup();
    clock.set('2026-10-20T09:30:00+02:00');

    await expect(useCase.execute({ token })).rejects.toMatchObject({ code: 'APPOINTMENT_IN_PAST' });
  });

  it('ne modifie, n\'envoie et ne trace rien quand l\'annulation est refusée', async () => {
    const { useCase, appointment, appointmentRepository, slotRepository, emailProvider, auditLogger } = await setup();

    await expect(useCase.execute({ token: 'inconnu' })).rejects.toThrow();

    expect((await appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CONFIRMED);
    expect((await slotRepository.findById('current'))?.status).toBe(SlotStatus.BOOKED);
    expect(emailProvider.sent).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });

  it('un second clic sur le même lien est refusé sans second email', async () => {
    const { useCase, token, emailProvider } = await setup();
    await useCase.execute({ token });
    const sentAfterFirst = emailProvider.sent.length;

    await expect(useCase.execute({ token })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });

    expect(emailProvider.sent).toHaveLength(sentAfterFirst);
  });
});
