// src/test/fakes/InMemoryHolidayRepository.ts
import { Holiday } from '@/domain/holiday/Holiday';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';
import { eachDate } from '@/domain/shared/IsoDate';

export class InMemoryHolidayRepository implements HolidayRepository {
  private readonly holidays = new Map<string, Holiday>();
  private sequence = 0;

  constructor(initial: Holiday[] = []) {
    initial.forEach((holiday) => this.holidays.set(holiday.id, holiday));
  }

  async findById(id: string): Promise<Holiday | null> {
    return this.holidays.get(id) ?? null;
  }

  async findAll(): Promise<Holiday[]> {
    return this.all().sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Même sémantique que l'implémentation Supabase : les jours récurrents sont évalués via `appliesTo`. */
  async findByDateRange(from: string, to: string): Promise<Holiday[]> {
    const dates = eachDate(from, to);
    return this.all().filter((holiday) => dates.some((date) => holiday.appliesTo(date)));
  }

  async save(holiday: Omit<Holiday, 'id'>): Promise<Holiday> {
    const saved = new Holiday(`holiday-${++this.sequence}`, holiday.date, holiday.label, holiday.isRecurring, holiday.endDate);
    this.holidays.set(saved.id, saved);
    return saved;
  }

  async delete(id: string): Promise<void> {
    this.holidays.delete(id);
  }

  all(): Holiday[] {
    return [...this.holidays.values()];
  }
}
