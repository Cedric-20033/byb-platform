// src/application/admin/GetDashboardStats.test.ts
import { describe, expect, it } from 'vitest';
import { GetDashboardStats } from './GetDashboardStats';
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import { TimeRange } from '@/domain/shared/TimeRange';
import { InMemoryAppointmentRepository } from '@/test/fakes/InMemoryAppointmentRepository';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { FixedClock } from '@/test/fakes/FixedClock';

const SERVICE_ID = 'service-1';

function slot(id: string, date: string, status: SlotStatus): Slot {
  return new Slot(id, date, new TimeRange('09:00', '10:00'), status, SERVICE_ID);
}

function appointment(id: string, slotId: string, status: AppointmentStatus): Appointment {
  return new Appointment(id, slotId, SERVICE_ID, null, `${id}@example.com`, id, '+32 470 00 00 00', null, status, new Date());
}

function build(nowIso: string) {
  const slots = new InMemorySlotRepository([
    slot('s-today-booked', '2026-10-01', SlotStatus.BOOKED),
    slot('s-today-blocked', '2026-10-01', SlotStatus.BLOCKED),
    slot('s-earlier-this-week', '2026-09-29', SlotStatus.BOOKED),
    slot('s-next-week', '2026-10-05', SlotStatus.BOOKED),
    slot('s-out-of-window', '2026-10-20', SlotStatus.BOOKED),
  ]);
  const appointments = new InMemoryAppointmentRepository(slots, [
    appointment('a1', 's-today-booked', AppointmentStatus.CONFIRMED),
    appointment('a2', 's-next-week', AppointmentStatus.PENDING),
    appointment('a3', 's-earlier-this-week', AppointmentStatus.CONFIRMED),
    appointment('a4', 's-out-of-window', AppointmentStatus.CONFIRMED),
  ]);
  return new GetDashboardStats(appointments, slots, FixedClock.at(nowIso));
}

describe('GetDashboardStats', () => {
  it('calcule les compteurs sur le jour et la semaine belges', async () => {
    const stats = await build('2026-10-01T10:00:00+02:00').execute();

    expect(stats.appointmentsToday).toBe(1);
    expect(stats.appointmentsThisWeek).toBe(2); // 29/09 et 01/10 ; le 05/10 est la semaine suivante
    expect(stats.pendingCount).toBe(1);
    expect(stats.blockedSlotsToday).toBe(1);
  });

  it('considère "aujourd\'hui" en heure belge juste après minuit (régression fuseau)', async () => {
    // 00h30 le 1er octobre à Bruxelles = 22h30 UTC le 30 septembre.
    const stats = await build('2026-09-30T22:30:00Z').execute();

    expect(stats.appointmentsToday).toBe(1);
    expect(stats.blockedSlotsToday).toBe(1);
  });

  it('produit 14 jours consécutifs à partir du lundi, y compris les jours vides', async () => {
    const { last14Days } = await build('2026-10-01T10:00:00+02:00').execute();

    expect(last14Days).toHaveLength(14);
    expect(last14Days[0].date).toBe('2026-09-28');
    expect(last14Days[13].date).toBe('2026-10-11');
    expect(last14Days.find((d) => d.date === '2026-10-05')?.count).toBe(1);
    expect(last14Days.find((d) => d.date === '2026-10-02')?.count).toBe(0);
    // Le RDV du 20/10 est hors fenêtre.
    expect(last14Days.reduce((total, d) => total + d.count, 0)).toBe(3);
  });
});
