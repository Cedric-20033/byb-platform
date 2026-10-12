// src/application/admin/GetCalendarRange.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { Holiday } from '@/domain/holiday/Holiday';
import { SlotStatus } from '@/domain/slot/Slot';
import { InMemoryHolidayRepository } from '@/test/fakes/InMemoryHolidayRepository';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { GetCalendarRange } from './GetCalendarRange';

const ALL = { blockedSlots: true, holidays: true };

function setup() {
  const world = buildAppointmentWorld([
    slot('late', '2026-12-24', '14:00', '15:00', SlotStatus.BOOKED),
    slot('early', '2026-12-24', '09:00', '10:00', SlotStatus.BOOKED),
    slot('cancelled', '2026-12-26', '09:00', '10:00', SlotStatus.AVAILABLE),
    slot('blocked', '2026-12-27', '09:00', '10:00', SlotStatus.BLOCKED),
    slot('outside', '2027-02-01', '09:00', '10:00', SlotStatus.BOOKED),
    slot('free', '2026-12-28', '09:00', '10:00', SlotStatus.AVAILABLE),
  ]);
  const holidays = new InMemoryHolidayRepository([
    new Holiday('h1', '2020-12-25', 'Noël', true),
    new Holiday('h2', '2026-12-31', 'Fermeture annuelle', false),
    new Holiday('h3', '2027-03-01', 'Hors période', false),
  ]);
  const useCase = new GetCalendarRange(world.appointmentRepository, world.slotRepository, holidays);
  const run = (layers = ALL) => useCase.execute({ from: '2026-12-21', to: '2027-01-03', layers });
  return { ...world, run };
}

describe('GetCalendarRange', () => {
  it('renvoie les rendez-vous actifs de la période, dans l\'ordre chronologique', async () => {
    const { run, seedAppointment } = setup();
    await seedAppointment('late', { name: 'Tard' });
    await seedAppointment('early', { name: 'Tôt' });
    await seedAppointment('outside', { name: 'Hors période' });

    const { appointments } = await run();

    expect(appointments.map((item) => item.appointment.clientName)).toEqual(['Tôt', 'Tard']);
  });

  it('exclut les rendez-vous annulés : ils n\'occupent plus de temps', async () => {
    const { run, seedAppointment } = setup();
    await seedAppointment('cancelled', { status: AppointmentStatus.CANCELLED });

    expect((await run()).appointments).toEqual([]);
  });

  it('renvoie les créneaux bloqués de la période, pas les créneaux libres', async () => {
    const { run } = setup();

    expect((await run()).blockedSlots.map((blocked) => blocked.id)).toEqual(['blocked']);
  });

  it('développe les jours fériés, y compris récurrents, jour par jour', async () => {
    const { run } = setup();

    expect((await run()).holidays).toEqual([
      { date: '2026-12-25', label: 'Noël' },
      { date: '2026-12-31', label: 'Fermeture annuelle' },
    ]);
  });

  it('n\'interroge que les couches demandées', async () => {
    const { run } = setup();

    const { blockedSlots, holidays } = await run({ blockedSlots: false, holidays: false });

    expect(blockedSlots).toEqual([]);
    expect(holidays).toEqual([]);
  });
});
