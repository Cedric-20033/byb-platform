// src/application/admin/ListHolidays.test.ts
import { describe, expect, it } from 'vitest';
import { Holiday } from '@/domain/holiday/Holiday';
import { InMemoryHolidayRepository } from '@/test/fakes/InMemoryHolidayRepository';
import { ListHolidays } from './ListHolidays';

describe('ListHolidays', () => {
  it('renvoie une liste vide quand aucun congé n\'est enregistré', async () => {
    expect(await new ListHolidays(new InMemoryHolidayRepository()).execute()).toEqual([]);
  });

  it('liste les jours fériés, les plages et les récurrences, du plus proche au plus lointain', async () => {
    const holidays = new InMemoryHolidayRepository();
    await holidays.save(new Holiday('', '2026-12-25', 'Noël', true));
    await holidays.save(new Holiday('', '2026-08-03', 'Congés annuels', false, '2026-08-14'));
    await holidays.save(new Holiday('', '2026-11-11', 'Armistice', true));

    const result = await new ListHolidays(holidays).execute();

    expect(result.map((holiday) => holiday.label)).toEqual(['Congés annuels', 'Armistice', 'Noël']);
    expect(result[0]).toMatchObject({ date: '2026-08-03', endDate: '2026-08-14', isRecurring: false });
  });
});
