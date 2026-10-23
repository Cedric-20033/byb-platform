// src/components/admin/slotsWeek.test.ts
import { describe, expect, it } from 'vitest';
import { SlotStatus } from '@/domain/slot/Slot';
import { buildWeek, formatWeekdayLabel, startOfIsoWeek, type WeekSlot } from './slotsWeek';

const slot = (id: string, date: string, start: string, status: string = SlotStatus.AVAILABLE): WeekSlot => ({
  id,
  date,
  startTime: `${start}:00`,
  endTime: `${start}:59`,
  status,
});

describe('startOfIsoWeek', () => {
  it.each([
    ['2026-10-12', '2026-10-12'], // un lundi reste lundi
    ['2026-10-14', '2026-10-12'], // mercredi
    ['2026-10-18', '2026-10-12'], // dimanche : appartient à la semaine qui finit
    ['2026-10-19', '2026-10-19'], // lundi suivant
    ['2026-11-01', '2026-10-26'], // passage de mois
    ['2027-01-01', '2026-12-28'], // passage d'année
  ])('%s appartient à la semaine du %s', (date, monday) => {
    expect(startOfIsoWeek(date)).toBe(monday);
  });
});

describe('buildWeek', () => {
  const slots = [
    slot('b', '2026-10-14', '14:00', SlotStatus.BOOKED),
    slot('a', '2026-10-14', '09:00'),
    slot('c', '2026-10-14', '11:00', SlotStatus.BLOCKED),
    slot('d', '2026-10-20', '09:00'),
    slot('e', '2026-10-25', '09:00'),
  ];
  const week = buildWeek(slots, '2026-10-12');

  it('produit toujours sept jours consécutifs, lundi en premier', () => {
    expect(week.map((day) => day.date)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });

  it('range les créneaux de chaque jour du plus tôt au plus tard', () => {
    expect(week[2].slots.map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('compte les créneaux par statut', () => {
    expect(week[2].counts).toEqual({ available: 1, booked: 1, blocked: 1 });
  });

  it('garde les jours sans créneau, avec une liste vide', () => {
    expect(week[0]).toEqual({ date: '2026-10-12', slots: [], counts: { available: 0, booked: 0, blocked: 0 } });
  });

  it('ignore les créneaux hors de la semaine', () => {
    expect(week.flatMap((day) => day.slots).map((s) => s.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('formatWeekdayLabel', () => {
  it('donne le jour de la semaine et la date, sans décalage de fuseau', () => {
    const label = formatWeekdayLabel('2026-10-20', 'fr');

    expect(label.toLowerCase()).toContain('mar');
    expect(label).toContain('20');
  });
});
