// src/infrastructure/supabase/repositories/SupabaseSlotRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import { TimeRange } from '@/domain/shared/TimeRange';
import type { SlotRangeFilter, SlotRepository } from '@/domain/slot/SlotRepository';
import { DomainError } from '@/domain/shared/DomainError';

type SlotRow = Database['public']['Tables']['slots']['Row'];

/**
 * Taille maximale d'une liste d'identifiants dans un filtre `in(...)` : elle voyage dans l'URL de la requête,
 * et une génération sur plusieurs mois peut produire des milliers de créneaux.
 */
const IDS_PER_REQUEST = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/**
 * Transitions de statut autorisées en base, indexées par statut CIBLE.
 * Sert de garde-fou atomique : l'UPDATE n'aboutit que si le statut ACTUEL
 * en base fait partie des statuts de départ autorisés (clause .in()).
 * C'est la défense en profondeur anti-double-réservation évoquée dans
 * CreateAppointment — même en cas de course entre deux requêtes simultanées,
 * une seule passera.
 */
const ALLOWED_FROM_STATUSES: Record<SlotStatus, SlotStatus[]> = {
  [SlotStatus.BOOKED]: [SlotStatus.AVAILABLE],
  [SlotStatus.BLOCKED]: [SlotStatus.AVAILABLE],
  [SlotStatus.AVAILABLE]: [SlotStatus.BOOKED, SlotStatus.BLOCKED],
};

export class SupabaseSlotRepository implements SlotRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Slot | null> {
    const { data, error } = await this.supabase.from('slots').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? this.toDomain(data) : null;
  }

  async findByDate(date: string): Promise<Slot[]> {
    const { data, error } = await this.supabase.from('slots').select('*').eq('date', date);
    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async findAvailableByService(serviceId: string, from: string, to: string): Promise<Slot[]> {
    const { data, error } = await this.supabase
      .from('slots')
      .select('*')
      .eq('service_id', serviceId)
      .eq('status', 'available')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async findBlockedBetween(from: string, to: string): Promise<Slot[]> {
    const { data, error } = await this.supabase
      .from('slots')
      .select('*')
      .eq('status', 'blocked')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async findInRange(filter: SlotRangeFilter): Promise<Slot[]> {
    let query = this.supabase.from('slots').select('*').gte('date', filter.from).lte('date', filter.to);
    if (filter.serviceId) query = query.eq('service_id', filter.serviceId);

    const { data, error } = await query.order('date', { ascending: true }).order('start_time', { ascending: true });
    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async updateStatusByIds(ids: string[], from: SlotStatus, to: SlotStatus): Promise<number> {
    let changed = 0;
    for (const batch of chunk(ids, IDS_PER_REQUEST)) {
      const { data, error } = await this.supabase
        .from('slots')
        .update({ status: to })
        .in('id', batch)
        .eq('status', from)
        .select('id');

      if (error) throw new Error(error.message);
      changed += data?.length ?? 0;
    }
    return changed;
  }

  async deleteByIds(ids: string[], onlyStatus: SlotStatus): Promise<number> {
    let deleted = 0;
    for (const batch of chunk(ids, IDS_PER_REQUEST)) {
      const { data, error } = await this.supabase
        .from('slots')
        .delete()
        .in('id', batch)
        .eq('status', onlyStatus)
        .select('id');

      if (error) throw new Error(error.message);
      deleted += data?.length ?? 0;
    }
    return deleted;
  }

  async save(slot: Omit<Slot, 'id'>): Promise<Slot> {
    const { data, error } = await this.supabase
      .from('slots')
      .insert({
        date: slot.date,
        start_time: slot.range.startTime,
        end_time: slot.range.endTime,
        status: slot.status,
        service_id: slot.serviceId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(data);
  }

  async updateStatus(id: string, status: Slot['status']): Promise<void> {
    const { data, error } = await this.supabase
      .from('slots')
      .update({ status })
      .eq('id', id)
      .in('status', ALLOWED_FROM_STATUSES[status])
      .select('id');

    if (error) throw new Error(error.message);

    // Aucune ligne affectée = le créneau a changé de statut entre la lecture
    // et l'écriture (concurrence). On le signale explicitement plutôt que
    // de laisser croire que la mise à jour a réussi.
    if (!data || data.length === 0) {
      throw new DomainError(
        'Ce créneau a été modifié entre-temps par une autre opération.',
        'SLOT_UNAVAILABLE',
      );
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('slots').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  private toDomain(row: SlotRow): Slot {
    return new Slot(
      row.id,
      row.date,
      new TimeRange(row.start_time, row.end_time),
      row.status as SlotStatus,
      row.service_id,
    );
  }
}
