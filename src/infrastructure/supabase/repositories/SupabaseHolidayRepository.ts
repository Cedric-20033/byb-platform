// src/infrastructure/supabase/repositories/SupabaseHolidayRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { Holiday } from '@/domain/holiday/Holiday';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';

type HolidayRow = Database['public']['Tables']['holidays']['Row'];

export class SupabaseHolidayRepository implements HolidayRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Holiday | null> {
    const { data, error } = await this.supabase.from('holidays').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<Holiday[]> {
    const { data, error } = await this.supabase.from('holidays').select('*').order('date');
    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async findByDateRange(from: string, to: string): Promise<Holiday[]> {
    // Les jours récurrents (ex: Noël) sont toujours inclus, quelle que soit la
    // période demandée : seule Holiday.appliesTo() (domaine) sait comparer
    // leur mois/jour à une date cible, indépendamment de l'année.
    // Un congé ponctuel (jour ou plage) est retenu s'il RECOUVRE la période : il commence avant
    // sa fin et se termine après son début.
    const { data, error } = await this.supabase
      .from('holidays')
      .select('*')
      .or(`is_recurring.eq.true,and(is_recurring.eq.false,date.lte.${to},end_date.gte.${from})`);

    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async save(holiday: Omit<Holiday, 'id'>): Promise<Holiday> {
    const { data, error } = await this.supabase
      .from('holidays')
      .insert({
        date: holiday.date,
        end_date: holiday.endDate,
        label: holiday.label,
        is_recurring: holiday.isRecurring,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('holidays').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  private toDomain(row: HolidayRow): Holiday {
    return new Holiday(row.id, row.date, row.label, row.is_recurring, row.end_date);
  }
}
