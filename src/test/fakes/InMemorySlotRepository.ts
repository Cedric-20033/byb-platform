// src/test/fakes/InMemorySlotRepository.ts
import { Slot, type SlotStatus } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';

/**
 * Repository en mémoire : permet de tester les use cases sans base de données,
 * en respectant le même contrat (port) que l'implémentation Supabase.
 */
export class InMemorySlotRepository implements SlotRepository {
  private readonly slots = new Map<string, Slot>();
  private sequence = 0;

  constructor(initial: Slot[] = []) {
    initial.forEach((slot) => this.slots.set(slot.id, slot));
  }

  async findById(id: string): Promise<Slot | null> {
    return this.slots.get(id) ?? null;
  }

  async findByDate(date: string): Promise<Slot[]> {
    return this.all().filter((slot) => slot.date === date);
  }

  async findAvailableByService(serviceId: string, from: string, to: string): Promise<Slot[]> {
    return this.all()
      .filter((slot) => slot.serviceId === serviceId && slot.isAvailable() && slot.date >= from && slot.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.range.startTime.localeCompare(b.range.startTime));
  }

  async save(slot: Omit<Slot, 'id'>): Promise<Slot> {
    const saved = new Slot(`slot-${++this.sequence}`, slot.date, slot.range, slot.status, slot.serviceId);
    this.slots.set(saved.id, saved);
    return saved;
  }

  async updateStatus(id: string, status: SlotStatus): Promise<void> {
    const current = this.slots.get(id);
    if (!current) throw new Error(`Créneau introuvable : ${id}`);
    // Slot est immuable : on remplace l'instance plutôt que de la muter.
    this.slots.set(id, new Slot(current.id, current.date, current.range, status, current.serviceId));
  }

  async delete(id: string): Promise<void> {
    this.slots.delete(id);
  }

  /** Aide aux assertions : état complet du dépôt. */
  all(): Slot[] {
    return [...this.slots.values()];
  }
}
