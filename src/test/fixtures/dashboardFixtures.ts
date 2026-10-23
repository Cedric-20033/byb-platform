// src/test/fixtures/dashboardFixtures.ts
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import { TimeRange } from '@/domain/shared/TimeRange';

export const SERVICE_A = 'service-a';
export const SERVICE_B = 'service-b';

export function buildSlot(
  id: string,
  date: string,
  status: SlotStatus = SlotStatus.BOOKED,
  startTime = '09:00',
  endTime = '10:00',
): Slot {
  return new Slot(id, date, new TimeRange(startTime, endTime), status, SERVICE_A);
}

export function buildAppointment(
  id: string,
  slotId: string,
  status: AppointmentStatus = AppointmentStatus.CONFIRMED,
  serviceId: string = SERVICE_A,
): Appointment {
  return new Appointment(id, slotId, serviceId, null, `${id}@example.com`, id, '+32 470 00 00 00', null, status, new Date());
}
