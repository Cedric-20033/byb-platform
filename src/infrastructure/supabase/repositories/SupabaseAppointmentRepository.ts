// src/infrastructure/supabase/repositories/SupabaseAppointmentRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import type {
  AppointmentRepository,
  AppointmentSearchFilters,
} from '@/domain/appointment/AppointmentRepository';

type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

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

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.serviceId) query = query.eq('service_id', filters.serviceId);
    if (filters.clientEmail) query = query.eq('client_email', filters.clientEmail);
    if (filters.dateFrom) query = query.gte('slots.date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('slots.date', filters.dateTo);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data.map(this.toDomain);
  }

  async save(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
        slot_id: appointment.slotId,
        service_id: appointment.serviceId,
        sub_service_id: null,
        client_name: appointment.clientName,
        client_email: appointment.clientEmail,
        client_phone: appointment.clientPhone,
        notes: null,
        status: appointment.status,
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

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('appointments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  private toDomain(row: AppointmentRow): Appointment {
    return new Appointment(
      row.id,
      row.slot_id,
      row.service_id,
      row.client_email,
      row.client_name,
      row.client_phone,
      row.status as AppointmentStatus,
      new Date(row.created_at),
    );
  }
}
