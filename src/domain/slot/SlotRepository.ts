// src/domain/slot/SlotRepository.ts
import type { Slot } from './Slot';

/**
 * Port de sortie : contrat de persistance des créneaux.
 * Toute implémentation (Supabase aujourd'hui, autre chose demain) doit le respecter.
 */
export interface SlotRepository {
  findById(id: string): Promise<Slot | null>;
  findByDate(date: string): Promise<Slot[]>;
  findAvailableByService(serviceId: string, from: string, to: string): Promise<Slot[]>;
  save(slot: Omit<Slot, 'id'>): Promise<Slot>;
  updateStatus(id: string, status: Slot['status']): Promise<void>;
  delete(id: string): Promise<void>;
}
