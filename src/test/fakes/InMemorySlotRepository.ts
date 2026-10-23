// src/test/fakes/InMemorySlotRepository.ts
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import type { SlotRangeFilter, SlotRepository } from '@/domain/slot/SlotRepository';

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

  async findBlockedBetween(from: string, to: string): Promise<Slot[]> {
    return this.all()
      .filter((slot) => slot.status === SlotStatus.BLOCKED && slot.date >= from && slot.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || a.range.startTime.localeCompare(b.range.startTime));
  }

  async findInRange(filter: SlotRangeFilter): Promise<Slot[]> {
    return this.all()
      .filter(
        (slot) =>
          slot.date >= filter.from && slot.date <= filter.to && (!filter.serviceId || slot.serviceId === filter.serviceId),
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.range.startTime.localeCompare(b.range.startTime));
  }

  /** Même contrat que Supabase : seuls les créneaux ayant encore le statut de départ sont modifiés. */
  async updateStatusByIds(ids: string[], from: SlotStatus, to: SlotStatus): Promise<number> {
    let changed = 0;
    for (const id of ids) {
      const current = this.slots.get(id);
      if (!current || current.status !== from) continue;
      this.slots.set(id, new Slot(current.id, current.date, current.range, to, current.serviceId));
      changed++;
    }
    return changed;
  }

  async deleteByIds(ids: string[], onlyStatus: SlotStatus): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (this.slots.get(id)?.status !== onlyStatus) continue;
      this.slots.delete(id);
      deleted++;
    }
    return deleted;
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
