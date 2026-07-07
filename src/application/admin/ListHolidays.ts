// src/application/admin/ListHolidays.ts
import type { Holiday } from '@/domain/holiday/Holiday';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';

/**
 * Use case : liste tous les jours fériés/congés pour l'écran d'administration.
 * Lecture seule — pas d'audit log (voir GetAvailableSlots pour la même convention).
 */
export class ListHolidays {
  constructor(private readonly holidayRepository: HolidayRepository) {}

  async execute(): Promise<Holiday[]> {
    return this.holidayRepository.findAll();
  }
}
