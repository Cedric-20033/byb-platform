// src/test/fixtures/clientAppointmentWorld.ts
// Monde de test commun aux use cases « par le client » : même câblage, écrit une seule fois.
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { FixedClock } from '@/test/fakes/FixedClock';
import { InMemoryClientAppointmentAccess } from '@/test/fakes/InMemoryClientAppointmentAccess';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { GetClientAppointment } from '@/application/booking/GetClientAppointment';

/** 15 octobre 2026, 10:00 à Bruxelles. */
export const NOW = '2026-10-15T10:00:00+02:00';
export const ADMIN_EMAIL = 'equipe@byb.test';

/**
 * Un rendez-vous existant sur le créneau « current » (20 octobre, 09:00), accessible par son jeton,
 * plus des créneaux libres supplémentaires à fournir par le test.
 */
export async function buildClientWorld(
  extraSlots = [slot('target', '2026-10-22', '14:00', '15:00')],
  status: AppointmentStatus = AppointmentStatus.CONFIRMED,
) {
  const world = buildAppointmentWorld([slot('current', '2026-10-20', '09:00', '10:00', SlotStatus.BOOKED), ...extraSlots]);
  const appointment = await world.seedAppointment('current', { status });

  const access = new InMemoryClientAppointmentAccess(world.appointmentRepository, world.slotRepository);
  const token = access.issueToken(appointment.id);
  const clock = FixedClock.at(NOW);

  return {
    ...world,
    appointment,
    token,
    clock,
    access,
    emailProvider: new FakeEmailProvider(),
    auditLogger: new FakeAuditLogger(),
    getClientAppointment: new GetClientAppointment(access, clock),
  };
}

export type ClientWorld = Awaited<ReturnType<typeof buildClientWorld>>;

export function buildCancelAppointment(world: ClientWorld) {
  return new CancelAppointment(world.appointmentRepository, world.slotRepository, world.emailProvider, world.auditLogger);
}
