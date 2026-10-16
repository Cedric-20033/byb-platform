'use server';

// src/app/actions/booking/cancelAppointment.ts
import { cancelAppointmentByTokenSchema } from '@/lib/validation/appointment';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { CancelAppointmentByClient } from '@/application/booking/CancelAppointmentByClient';
import { GetClientAppointment } from '@/application/booking/GetClientAppointment';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseClientAppointmentAccess } from '@/infrastructure/supabase/repositories/SupabaseClientAppointmentAccess';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { getClientIp } from '@/infrastructure/http/getClientIp';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { getAdminNotificationEmail } from '@/lib/booking/adminNotificationEmail';
import { createPublicBookingGuard } from '@/lib/booking/createPublicBookingGuard';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';

export type CancelAppointmentActionState = { success: true } | ActionFailure;

/**
 * Annulation par un visiteur via le lien reçu par email (jeton dans l'URL).
 *
 * Le jeton est résolu en rendez-vous par `SupabaseClientAppointmentAccess`, puis toute la logique
 * (rendez-vous encore actif, annulation, libération du créneau, emails, audit) est celle des use cases :
 * rien n'est dupliqué en SQL. La fonction `cancel_appointment_by_token` de la base n'est volontairement
 * pas appelée ici. Le jeton n'est ni journalisé ni renvoyé dans une erreur.
 */
export async function cancelAppointmentByTokenAction(
  input: unknown,
): Promise<CancelAppointmentActionState> {
  try {
    const parsed = cancelAppointmentByTokenSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const supabase = createServiceRoleClient();
    await createPublicBookingGuard(supabase).assertCanUseToken({ ip: await getClientIp() });

    const emailProvider = new ResendEmailProvider();
    const useCase = new CancelAppointmentByClient(
      new GetClientAppointment(new SupabaseClientAppointmentAccess(supabase)),
      new CancelAppointment(
        new SupabaseAppointmentRepository(supabase),
        new SupabaseSlotRepository(supabase),
        emailProvider,
        new SupabaseAuditLogger(),
      ),
      emailProvider,
      getAdminNotificationEmail(),
    );

    await useCase.execute({ token: parsed.data.token });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
