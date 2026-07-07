'use server';

// src/app/actions/booking/cancelAppointment.ts
import { cancelAppointmentByTokenSchema } from '@/lib/validation/appointment';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { ActorRole } from '@/domain/shared/AuditLogger';

export type CancelAppointmentActionState = { success: true } | { success: false; error: string };

/**
 * Annulation par un visiteur via le lien reçu par email (token dans l'URL).
 *
 * `get_appointment_by_token` (RPC Postgres) sert uniquement à résoudre le
 * token en identifiant de RDV. La logique d'annulation reste entièrement dans
 * CancelAppointment (use case) pour ne pas dupliquer les règles métier entre
 * SQL et application — la fonction jumelle `cancel_appointment_by_token`
 * existe en base mais n'est volontairement pas appelée ici.
 */
export async function cancelAppointmentByTokenAction(
  input: unknown,
): Promise<CancelAppointmentActionState> {
  const parsed = cancelAppointmentByTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Lien invalide.' };
  }

  const supabase = createServiceRoleClient();

  const { data: resolved, error: rpcError } = await supabase
    .rpc('get_appointment_by_token', { p_token: parsed.data.token })
    .maybeSingle();

  if (rpcError || !resolved) {
    return { success: false, error: 'Rendez-vous introuvable ou lien expiré.' };
  }

  const useCase = new CancelAppointment(
    new SupabaseAppointmentRepository(supabase),
    new SupabaseSlotRepository(supabase),
    new ResendEmailProvider(),
    new SupabaseAuditLogger(),
  );

  try {
    await useCase.execute({
      appointmentId: resolved.id,
      actorId: null,
      actorRole: ActorRole.CLIENT,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue.' };
  }
}
