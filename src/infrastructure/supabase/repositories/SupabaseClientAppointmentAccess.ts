// src/infrastructure/supabase/repositories/SupabaseClientAppointmentAccess.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { ClientAppointmentAccess, ClientAppointmentView } from '@/domain/appointment/ClientAppointmentAccess';
import { toAppointment, type AppointmentRow } from './appointmentMapper';

type AppointmentRowWithSlot = AppointmentRow & {
  slots: { id: string; date: string; start_time: string; end_time: string };
};

// Un jeton est un UUID : toute autre valeur ne peut désigner aucun rendez-vous. On évite ainsi
// l'erreur Postgres « invalid input syntax for type uuid » sur une entrée arbitraire de l'URL.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lecture d'un rendez-vous par son jeton d'accès. Attend un client service_role : le visiteur n'a pas de
 * session, la RLS lui interdit toute lecture directe, et c'est le jeton qui tient lieu d'autorisation.
 */
export class SupabaseClientAppointmentAccess implements ClientAppointmentAccess {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByToken(token: string): Promise<ClientAppointmentView | null> {
    if (!UUID_PATTERN.test(token)) return null;

    const { data, error } = await this.supabase
      .from('appointments')
      .select('*, slots!inner(id, date, start_time, end_time)')
      .eq('access_token', token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as AppointmentRowWithSlot;
    return {
      appointment: toAppointment(row),
      slot: { id: row.slots.id, date: row.slots.date, startTime: row.slots.start_time, endTime: row.slots.end_time },
    };
  }
}
