// src/domain/holiday/HolidayRepository.ts
import type { Holiday } from './Holiday';

/**
 * Port de sortie : contrat de persistance des jours fériés et congés.
 */
export interface HolidayRepository {
  findById(id: string): Promise<Holiday | null>;
  findAll(): Promise<Holiday[]>;
  findByDateRange(from: string, to: string): Promise<Holiday[]>;
  save(holiday: Omit<Holiday, 'id'>): Promise<Holiday>;
  delete(id: string): Promise<void>;
}
