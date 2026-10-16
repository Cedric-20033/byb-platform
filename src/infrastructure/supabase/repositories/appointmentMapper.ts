// src/infrastructure/supabase/repositories/appointmentMapper.ts
import type { Database } from '@/types/database';
import { Appointment, type AppointmentStatus } from '@/domain/appointment/Appointment';
import { toAppointmentLocale } from '@/domain/appointment/AppointmentLocale';

export type AppointmentRow = Database['public']['Tables']['appointments']['Row'];

/** Ligne SQL → entité du domaine. Partagé par tous les adaptateurs qui lisent la table `appointments`. */
export function toAppointment(row: AppointmentRow): Appointment {
  return new Appointment(
    row.id,
    row.slot_id,
    row.service_id,
    row.sub_service_id,
    row.client_email,
    row.client_name,
    row.client_phone,
    row.notes,
    row.status as AppointmentStatus,
    new Date(row.created_at),
    toAppointmentLocale(row.locale),
  );
}
