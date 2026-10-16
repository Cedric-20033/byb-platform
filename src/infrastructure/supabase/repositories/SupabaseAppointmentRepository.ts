// src/infrastructure/supabase/repositories/SupabaseAppointmentRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Appointment } from '@/domain/appointment/Appointment';
import type {
  AppointmentContactDetails,
  AppointmentPage,
  AppointmentPageRequest,
  AppointmentRepository,
  AppointmentSearchFilters,
  AppointmentSortField,
  SortDirection,
} from '@/domain/appointment/AppointmentRepository';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';
import { toAppointment, type AppointmentRow } from './appointmentMapper';
import { buildTextSearchFilter } from './postgrestSearch';

// Ligne retournée par la jointure `slots!inner(...)` : les colonnes du créneau
// s'ajoutent sous la clé `slots`, imbriquée par PostgREST.
type AppointmentRowWithSlot = AppointmentRow & {
  slots: { date: string; start_time: string; end_time: string };
};

const SELECT_WITH_SLOT = '*, slots!inner(date, start_time, end_time)';

export class SupabaseAppointmentRepository implements AppointmentRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Appointment | null> {
    const { data, error } = await this.supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.toDomain(data) : null;
  }

  async findAll(): Promise<Appointment[]> {
    const { data, error } = await this.supabase.from('appointments').select('*');
    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async search(filters: AppointmentSearchFilters): Promise<Appointment[]> {
    // `slots!inner` : jointure interne nécessaire pour pouvoir filtrer sur
    // la date du créneau lié (dateFrom/dateTo), qui n'existe pas sur la table appointments.
    let query = this.supabase.from('appointments').select('*, slots!inner(date)');
    query = this.applyFilters(query, filters);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async searchWithSlot(filters: AppointmentSearchFilters): Promise<AppointmentWithSlot[]> {
    let query = this.supabase.from('appointments').select(SELECT_WITH_SLOT);
    query = this.applyFilters(query, filters);
    query = this.applySort(query, 'slotDate', 'desc');

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data as AppointmentRowWithSlot[]).map((row) => this.toWithSlot(row));
  }

  async searchPage(filters: AppointmentSearchFilters, request: AppointmentPageRequest): Promise<AppointmentPage> {
    const from = (request.page - 1) * request.pageSize;
    const to = from + request.pageSize - 1;

    let query = this.supabase.from('appointments').select(SELECT_WITH_SLOT, { count: 'exact' });
    query = this.applyFilters(query, filters);
    query = this.applySort(query, request.sortField, request.direction).range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return { items: (data as AppointmentRowWithSlot[]).map((row) => this.toWithSlot(row)), total: count ?? 0 };
  }

  async save(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
        slot_id: appointment.slotId,
        service_id: appointment.serviceId,
        sub_service_id: appointment.subServiceId,
        client_name: appointment.clientName,
        client_email: appointment.clientEmail,
        client_phone: appointment.clientPhone,
        notes: appointment.notes,
        status: appointment.status,
        locale: appointment.locale,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.toDomain(data);
  }

  async updateStatus(id: string, status: Appointment['status']): Promise<void> {
    const { error } = await this.supabase.from('appointments').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async updateDetails(id: string, details: AppointmentContactDetails): Promise<void> {
    const { error } = await this.supabase
      .from('appointments')
      .update({
        client_name: details.clientName,
        client_email: details.clientEmail,
        client_phone: details.clientPhone,
        notes: details.notes,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('appointments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async countUpcomingByEmail(email: string, fromDate: string): Promise<number> {
    // Comparaison exacte : les emails sont enregistrés en minuscules (voir CreateAppointment). `ilike`
    // est évité car `_`, fréquent dans une adresse, y serait un joker.
    const { count, error } = await this.supabase
      .from('appointments')
      .select('id, slots!inner(date)', { count: 'exact', head: true })
      .eq('client_email', email)
      .neq('status', 'cancelled')
      .gte('slots.date', fromDate);

    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  /** Factorise les clauses WHERE communes à `search`, `searchWithSlot` et `searchPage`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, filters: AppointmentSearchFilters) {
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.serviceId) query = query.eq('service_id', filters.serviceId);
    if (filters.clientEmail) query = query.eq('client_email', filters.clientEmail);
    if (filters.query?.trim()) query = query.or(buildTextSearchFilter(filters.query));
    if (filters.dateFrom) query = query.gte('slots.date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('slots.date', filters.dateTo);
    return query;
  }

  /**
   * Tri sur le rendez-vous ou, pour `slotDate`, sur le créneau lié (`slots(date)` : PostgREST ordonne
   * les lignes parentes par une colonne d'une relation to-one). L'identifiant en dernier critère rend
   * l'ordre total : sans lui, deux lignes à égalité pourraient changer de page d'une requête à l'autre.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applySort(query: any, field: AppointmentSortField, direction: SortDirection) {
    const ascending = direction === 'asc';
    switch (field) {
      case 'slotDate':
        query = query.order('slots(date)', { ascending }).order('slots(start_time)', { ascending });
        break;
      case 'clientName':
        query = query.order('client_name', { ascending });
        break;
      case 'status':
        query = query.order('status', { ascending });
        break;
      case 'createdAt':
        query = query.order('created_at', { ascending });
        break;
    }
    return query.order('id', { ascending: true });
  }

  private toWithSlot(row: AppointmentRowWithSlot): AppointmentWithSlot {
    return {
      appointment: this.toDomain(row),
      slotDate: row.slots.date,
      slotStartTime: row.slots.start_time,
      slotEndTime: row.slots.end_time,
    };
  }

  private toDomain(row: AppointmentRow): Appointment {
    return toAppointment(row);
  }
}
