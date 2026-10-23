// src/infrastructure/supabase/repositories/SupabaseAppointmentPlanner.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { AppointmentRemover } from '@/domain/appointment/AppointmentRemover';
import type { AppointmentRescheduler } from '@/domain/appointment/AppointmentRescheduler';
import { DomainError, type DomainErrorCode } from '@/domain/shared/DomainError';
import { ForbiddenError } from '@/lib/errors';

/** Messages levés par les fonctions SQL (migration 0012) qui ont un équivalent métier. */
const RPC_DOMAIN_ERRORS: Readonly<Record<string, DomainErrorCode>> = {
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
};

/**
 * Traduit une erreur Postgres en erreur applicative.
 *  - `FORBIDDEN` : la RLS a filtré une mise à jour de créneau ; la fonction a tout annulé ;
 *  - 23505 : course sur le créneau visé (index unique partiel des rendez-vous actifs).
 */
export function toPlannerError(error: { code?: string; message: string }): Error {
  const code = RPC_DOMAIN_ERRORS[error.message];
  if (code) return new DomainError(error.message, code);
  if (error.message === 'FORBIDDEN') return new ForbiddenError();
  if (error.code === '23505') return new DomainError('Créneau déjà réservé.', 'SLOT_UNAVAILABLE');
  return new Error(error.message);
}

/**
 * Opérations de planning qui touchent plusieurs lignes, exécutées en une transaction côté base
 * (fonctions `reschedule_appointment` et `delete_appointment`) avec les droits de l'admin connecté.
 * Une seule classe pour deux ports étroits : les use cases ne dépendent que de celui dont ils ont besoin.
 */
export class SupabaseAppointmentPlanner implements AppointmentRescheduler, AppointmentRemover {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async reschedule(appointmentId: string, newSlotId: string): Promise<void> {
    const { error } = await this.supabase.rpc('reschedule_appointment', {
      p_appointment_id: appointmentId,
      p_new_slot_id: newSlotId,
    });
    if (error) throw toPlannerError(error);
  }

  async remove(appointmentId: string): Promise<void> {
    const { error } = await this.supabase.rpc('delete_appointment', { p_appointment_id: appointmentId });
    if (error) throw toPlannerError(error);
  }
}
