// src/test/fixtures/appointmentWorld.ts
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import { TimeRange } from '@/domain/shared/TimeRange';
import { InMemoryAppointmentPlanner } from '@/test/fakes/InMemoryAppointmentPlanner';
import { InMemoryAppointmentRepository } from '@/test/fakes/InMemoryAppointmentRepository';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';

export const SERVICE = 'service-toiture';
export const OTHER_SERVICE = 'service-bardage';

/** Les créneaux viennent de la base au format « HH:mm:ss » : les fixtures le reproduisent. */
export const slot = (id: string, date: string, start: string, end: string, status = SlotStatus.AVAILABLE, serviceId = SERVICE) =>
  new Slot(id, date, new TimeRange(`${start}:00`, `${end}:00`), status, serviceId);

/**
 * Dépôts en mémoire câblés ensemble (créneaux, rendez-vous, planner) pour les tests des use cases de planning.
 */
export function buildAppointmentWorld(slots: Slot[] = []) {
  const slotRepository = new InMemorySlotRepository(slots);
  const appointmentRepository = new InMemoryAppointmentRepository(slotRepository);
  const planner = new InMemoryAppointmentPlanner(slotRepository, appointmentRepository);

  /** Insère un rendez-vous sur un créneau existant (que l'appelant a déjà passé à « booked »). */
  const seedAppointment = (
    slotId: string,
    overrides: Partial<{ status: AppointmentStatus; name: string; email: string; phone: string; notes: string | null; serviceId: string }> = {},
  ) =>
    appointmentRepository.save(
      new Appointment(
        '',
        slotId,
        overrides.serviceId ?? SERVICE,
        null,
        overrides.email ?? 'alice@example.com',
        overrides.name ?? 'Alice Martin',
        overrides.phone ?? '+32 470 12 34 56',
        overrides.notes === undefined ? 'Prévoir une échelle' : overrides.notes,
        overrides.status ?? AppointmentStatus.CONFIRMED,
        new Date('2026-10-01T10:00:00Z'),
      ),
    );

  return { slotRepository, appointmentRepository, planner, seedAppointment };
}
