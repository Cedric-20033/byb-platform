// src/application/booking/CreateAppointmentAutoConfirm.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { FixedClock } from '@/test/fakes/FixedClock';
import { SERVICE, buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { CreateAppointment } from './CreateAppointment';

/** 15 octobre 2026, 10:00 à Bruxelles. */
const NOW = '2026-10-15T10:00:00+02:00';
const BASE_POLICY = { minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 3 };

/** Réglage « confirmation des demandes » de /dashboard/settings : effet sur le statut d'un nouveau rendez-vous. */
async function bookWith(policy: typeof BASE_POLICY & { autoConfirm?: boolean }) {
  const world = buildAppointmentWorld([slot('a', '2026-10-20', '09:00', '10:00')]);
  const useCase = new CreateAppointment(
    world.appointmentRepository,
    world.slotRepository,
    new FakeEmailProvider(),
    new FakeAuditLogger(),
    'equipe@byb.test',
    policy,
    FixedClock.at(NOW),
  );

  return useCase.execute({
    slotId: 'a',
    serviceId: SERVICE,
    clientName: 'Alice Martin',
    clientEmail: 'alice@example.com',
    clientPhone: '+32 470 12 34 56',
  });
}

describe('CreateAppointment : confirmation des demandes', () => {
  it('laisse la demande en attente en mode manuel', async () => {
    expect((await bookWith({ ...BASE_POLICY, autoConfirm: false })).status).toBe(AppointmentStatus.PENDING);
  });

  it('laisse la demande en attente quand le réglage est absent (comportement historique)', async () => {
    expect((await bookWith(BASE_POLICY)).status).toBe(AppointmentStatus.PENDING);
  });

  it('confirme la demande dès la réservation en mode automatique', async () => {
    expect((await bookWith({ ...BASE_POLICY, autoConfirm: true })).status).toBe(AppointmentStatus.CONFIRMED);
  });
});
