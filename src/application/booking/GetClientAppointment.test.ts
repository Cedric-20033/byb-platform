// src/application/booking/GetClientAppointment.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { TEST_TOKEN } from '@/test/fakes/InMemoryClientAppointmentAccess';
import { buildClientWorld } from '@/test/fixtures/clientAppointmentWorld';

describe('GetClientAppointment', () => {
  it('renvoie le rendez-vous et son créneau pour un jeton valide', async () => {
    const world = await buildClientWorld();

    const { view, state } = await world.getClientAppointment.execute({ token: world.token });

    expect(view.appointment.id).toBe(world.appointment.id);
    expect(view.slot).toEqual({ id: 'current', date: '2026-10-20', startTime: '09:00:00', endTime: '10:00:00' });
    expect(state).toBe('active');
  });

  it('refuse un jeton inconnu', async () => {
    const world = await buildClientWorld();

    await expect(world.getClientAppointment.execute({ token: 'inconnu' })).rejects.toMatchObject({
      code: 'APPOINTMENT_NOT_FOUND',
    });
  });

  it('signale un rendez-vous annulé', async () => {
    const world = await buildClientWorld(undefined, AppointmentStatus.CANCELLED);

    expect((await world.getClientAppointment.execute({ token: world.token })).state).toBe('cancelled');
  });

  it('signale un rendez-vous passé', async () => {
    const world = await buildClientWorld();
    world.clock.set('2026-10-20T09:30:00+02:00');

    expect((await world.getClientAppointment.execute({ token: TEST_TOKEN })).state).toBe('past');
  });

  it('ne modifie rien', async () => {
    const world = await buildClientWorld();

    await world.getClientAppointment.execute({ token: world.token });

    expect(world.auditLogger.entries).toEqual([]);
    expect(world.emailProvider.sent).toEqual([]);
  });
});
