// src/domain/slot/Slot.ts
import { TimeRange } from '../shared/TimeRange';

/**
 * Entité métier : un créneau horaire réservable.
 *
 * Porte la règle anti-double-réservation au niveau domaine, en complément
 * de la contrainte d'unicité en base de données. Deux niveaux de défense :
 * ici (avant d'appeler le repository) et en base (si deux requêtes concurrentes
 * passent la première vérification en même temps).
 */
export class Slot {
  constructor(
    public readonly id: string,
    public readonly date: string, // format ISO "YYYY-MM-DD"
    public readonly range: TimeRange,
    public readonly status: SlotStatus,
    public readonly serviceId: string | null,
  ) {}

  isAvailable(): boolean {
    return this.status === SlotStatus.AVAILABLE;
  }

  canBeBooked(): boolean {
    return this.status === SlotStatus.AVAILABLE;
  }

  canBeBlocked(): boolean {
    return this.status === SlotStatus.AVAILABLE;
  }

  canBeUnblocked(): boolean {
    return this.status === SlotStatus.BLOCKED;
  }

  /**
   * Vérifie le chevauchement avec un autre créneau de la même journée.
   * Utilisé quand l'admin crée manuellement des créneaux, pour éviter les doublons.
   */
  overlapsWith(other: Slot): boolean {
    return this.date === other.date && this.range.overlaps(other.range);
  }
}

export enum SlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
}
