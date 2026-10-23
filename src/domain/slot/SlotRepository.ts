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
  /** Créneaux bloqués entre deux dates incluses (vue calendrier). */
  findBlockedBetween(from: string, to: string): Promise<Slot[]>;
  /** Créneaux d'une période (dates incluses), tous statuts, optionnellement d'un seul service. */
  findInRange(filter: SlotRangeFilter): Promise<Slot[]>;
  /**
   * Passe en bloc les créneaux `ids` de `from` à `to`, et renvoie combien ont réellement changé. La condition
   * sur le statut de départ est appliquée côté base : un créneau réservé entre la lecture et l'écriture
   * n'est pas touché (même garde-fou que `updateStatus`, sans lever d'erreur : c'est un traitement de masse).
   */
  updateStatusByIds(ids: string[], from: Slot['status'], to: Slot['status']): Promise<number>;
  /** Supprime en bloc les créneaux `ids` qui ont encore le statut `onlyStatus`, et renvoie combien l'ont été. */
  deleteByIds(ids: string[], onlyStatus: Slot['status']): Promise<number>;
  save(slot: Omit<Slot, 'id'>): Promise<Slot>;
  updateStatus(id: string, status: Slot['status']): Promise<void>;
  delete(id: string): Promise<void>;
}

export type SlotRangeFilter = {
  from: string;
  to: string;
  /** Absent = tous les services. */
  serviceId?: string | null;
};
