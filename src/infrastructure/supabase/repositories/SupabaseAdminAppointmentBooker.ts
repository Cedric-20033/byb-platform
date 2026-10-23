// src/infrastructure/supabase/repositories/SupabaseAdminAppointmentBooker.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Appointment } from '@/domain/appointment/Appointment';
import type { AdminAppointmentBooker, AdminBookingRequest } from '@/domain/appointment/AdminAppointmentBooker';
import { DomainError, type DomainErrorCode } from '@/domain/shared/DomainError';
import { SupabaseAppointmentRepository } from './SupabaseAppointmentRepository';

/** Messages levés par `admin_create_appointment` (migration 0011) qui ont un équivalent métier. */
const RPC_DOMAIN_ERRORS: Readonly<Record<string, DomainErrorCode>> = {
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  SUB_SERVICE_NOT_FOUND: 'SUB_SERVICE_NOT_FOUND',
};

/**
 * Traduit une erreur Postgres de la fonction en erreur applicative.
 * Les codes SQL couvrent les courses que les vérifications de la fonction ne peuvent pas voir :
 *  - 23505 : créneau déjà réservé (index unique partiel) ou doublon exact de créneau ponctuel ;
 *  - 23503 : service supprimé entre-temps (clé étrangère).
 */
export function toBookingError(error: { code?: string; message: string }): Error {
  const code = RPC_DOMAIN_ERRORS[error.message];
  if (code) return new DomainError(error.message, code);
  if (error.code === '23505') return new DomainError('Créneau déjà réservé.', 'SLOT_UNAVAILABLE');
  if (error.code === '23503') return new DomainError('Service introuvable.', 'SERVICE_NOT_FOUND');
  return new Error(error.message);
}

/**
 * Implémentation Supabase de la réservation manuelle : une seule transaction côté base
 * (fonction `admin_create_appointment`), exécutée avec les droits de l'admin connecté.
 * La RLS reste donc la seconde barrière derrière `assertPermission()`.
 */
export class SupabaseAdminAppointmentBooker implements AdminAppointmentBooker {
  private readonly appointments: SupabaseAppointmentRepository;

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.appointments = new SupabaseAppointmentRepository(supabase);
  }

  async bookConfirmed(request: AdminBookingRequest): Promise<Appointment> {
    const { slot } = request;

    // Les paramètres optionnels de la fonction sont omis (undefined) plutôt que passés à null.
    const { data: appointmentId, error } = await this.supabase.rpc('admin_create_appointment', {
      p_service_id: request.serviceId,
      p_sub_service_id: request.subServiceId ?? undefined,
      p_slot_id: slot.kind === 'existing' ? slot.slotId : undefined,
      p_date: slot.kind === 'adHoc' ? slot.date : undefined,
      p_start_time: slot.kind === 'adHoc' ? slot.startTime : undefined,
      p_end_time: slot.kind === 'adHoc' ? slot.endTime : undefined,
      p_client_name: request.clientName,
      p_client_email: request.clientEmail,
      p_client_phone: request.clientPhone,
      p_notes: request.notes ?? undefined,
    });
    if (error) throw toBookingError(error);

    const appointment = await this.appointments.findById(appointmentId);
    if (!appointment) throw new Error(`Rendez-vous ${appointmentId} introuvable juste après sa création.`);
    return appointment;
  }
}
