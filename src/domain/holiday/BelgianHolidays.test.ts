// src/domain/holiday/BelgianHolidays.test.ts
import { describe, expect, it } from 'vitest';
import { BELGIAN_HOLIDAY_KEYS, easterSunday, getBelgianHolidays } from './BelgianHolidays';

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2038, '2038-04-25'], // date de Pâques la plus tardive possible
    [2285, '2285-03-22'], // date de Pâques la plus précoce possible
  ])('Pâques %i tombe le %s', (year, expected) => {
    expect(easterSunday(year)).toBe(expected);
  });
});

describe('getBelgianHolidays', () => {
  const byKey = (year: number) => Object.fromEntries(getBelgianHolidays(year).map((rule) => [rule.key, rule.date]));

  it('renvoie les dix jours fériés légaux, chacun une fois', () => {
    const keys = getBelgianHolidays(2026).map((rule) => rule.key);

    expect([...keys].sort()).toEqual([...BELGIAN_HOLIDAY_KEYS].sort());
  });

  it('place les fêtes à date fixe', () => {
    expect(byKey(2026)).toMatchObject({
      newYear: '2026-01-01',
      labourDay: '2026-05-01',
      nationalDay: '2026-07-21',
      assumption: '2026-08-15',
      allSaints: '2026-11-01',
      armistice: '2026-11-11',
      christmas: '2026-12-25',
    });
  });

  it.each([
    [2024, { easterMonday: '2024-04-01', ascension: '2024-05-09', whitMonday: '2024-05-20' }],
    [2025, { easterMonday: '2025-04-21', ascension: '2025-05-29', whitMonday: '2025-06-09' }],
    [2026, { easterMonday: '2026-04-06', ascension: '2026-05-14', whitMonday: '2026-05-25' }],
  ])('calcule les fêtes mobiles de %i depuis Pâques', (year, expected) => {
    expect(byKey(year)).toMatchObject(expected);
  });

  it('tombe toujours un lundi pour les lundis de Pâques et de Pentecôte, un jeudi pour l\'Ascension', () => {
    for (const year of [2024, 2026, 2030, 2038]) {
      const dates = byKey(year);
      const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

      expect(weekday(dates.easterMonday), `Pâques ${year}`).toBe(1);
      expect(weekday(dates.whitMonday), `Pentecôte ${year}`).toBe(1);
      expect(weekday(dates.ascension), `Ascension ${year}`).toBe(4);
    }
  });

  it('marque récurrentes les fêtes fixes seulement : les fêtes mobiles sont propres à l\'année', () => {
    const recurring = Object.fromEntries(getBelgianHolidays(2026).map((rule) => [rule.key, rule.recurring]));

    expect(recurring).toMatchObject({ christmas: true, newYear: true, easterMonday: false, ascension: false, whitMonday: false });
  });

  it('est triée par date', () => {
    const dates = getBelgianHolidays(2026).map((rule) => rule.date);

    expect(dates).toEqual([...dates].sort());
  });
});
