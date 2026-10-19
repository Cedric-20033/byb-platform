// src/application/admin/GetFreeSlotsOutlook.test.ts
import { describe, expect, it } from 'vitest';
import { GetFreeSlotsOutlook } from './GetFreeSlotsOutlook';
import { SlotStatus } from '@/domain/slot/Slot';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { FixedClock } from '@/test/fakes/FixedClock';
import { buildSlot } from '@/test/fixtures/dashboardFixtures';

const NOW = '2026-10-19T10:00:00+02:00';

function build() {
  return new GetFreeSlotsOutlook(
    new InMemorySlotRepository([
      buildSlot('past-today', '2026-10-19', SlotStatus.AVAILABLE, '09:00', '10:00'),
      buildSlot('later-today', '2026-10-19', SlotStatus.AVAILABLE, '14:00', '15:00'),
      buildSlot('blocked-today', '2026-10-19', SlotStatus.BLOCKED, '15:00', '16:00'),
      buildSlot('booked-today', '2026-10-19', SlotStatus.BOOKED, '16:00', '17:00'),
      buildSlot('tomorrow-1', '2026-10-20', SlotStatus.AVAILABLE, '09:00', '10:00'),
      buildSlot('tomorrow-2', '2026-10-20', SlotStatus.AVAILABLE, '10:00', '11:00'),
      buildSlot('last-day', '2026-10-25', SlotStatus.AVAILABLE),
      buildSlot('out-of-window', '2026-10-26', SlotStatus.AVAILABLE),
    ]),
    FixedClock.at(NOW),
  );
}

describe('GetFreeSlotsOutlook', () => {
  it('compte, jour par jour sur 7 jours, uniquement les créneaux libres encore réservables', async () => {
    const { days, total } = await build().execute();

    expect(days.map((day) => day.date)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
    // Aujourd'hui : le créneau de 9h est passé, ceux bloqué et réservé ne sont pas libres.
    expect(days.map((day) => day.count)).toEqual([1, 2, 0, 0, 0, 0, 1]);
    expect(total).toBe(4);
  });

  it('renvoie 7 jours à zéro quand aucun créneau n\'existe', async () => {
    const outlook = await new GetFreeSlotsOutlook(new InMemorySlotRepository(), FixedClock.at(NOW)).execute();

    expect(outlook.days).toHaveLength(7);
    expect(outlook.total).toBe(0);
  });
});
