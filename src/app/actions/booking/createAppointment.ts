'use server';

// src/app/actions/booking/createAppointment.ts
import { createAppointmentSchema } from '@/lib/validation/appointment';
import { CreateAppointment } from '@/application/booking/CreateAppointment';
import { toAppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { DeferredEmailProvider } from '@/infrastructure/email/DeferredEmailProvider';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { getClientIp } from '@/infrastructure/http/getClientIp';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { createPublicBookingGuard } from '@/lib/booking/createPublicBookingGuard';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { resolveBookingSettings } from '@/lib/settings/resolveBookingSettings';

export type CreateAppointmentActionState =
  | { success: true; appointmentId: string }
  | ActionFailure;

/**
 * Composition root : c'est ICI, et seulement ici, qu'on instancie les
 * implémentations Supabase concrètes et qu'on les injecte dans le use case.
 * Ni domain/ ni application/ n'ont jamais vu Supabase directement.
 *
 * Client service_role : un visiteur qui réserve n'a pas de session Supabase.
 */
export async function createAppointmentAction(input: unknown): Promise<CreateAppointmentActionState> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return failure('VALIDATION_FAILED');
  }

  const { website, captchaToken, locale, ...booking } = parsed.data;

  // Piège à robots : un humain ne voit pas ce champ. On répond par un faux succès, sans rien créer :
  // un refus apprendrait au robot qu'il est détecté et qu'il doit changer de méthode.
  if (website) {
    return { success: true, appointmentId: '' };
  }

  const supabase = createServiceRoleClient();

  try {
    // Politique de réservation et destinataire interne : réglages de l'entreprise (repli sur les valeurs par défaut).
    const { policy, adminNotificationEmail } = await resolveBookingSettings(supabase);
    const useCase = new CreateAppointment(
      new SupabaseAppointmentRepository(supabase),
      new SupabaseSlotRepository(supabase),
      // Les emails partent après la réponse : le visiteur ne doit pas attendre Resend pour voir sa confirmation.
      new DeferredEmailProvider(new ResendEmailProvider()),
      new SupabaseAuditLogger(),
      adminNotificationEmail,
      policy,
    );

    await createPublicBookingGuard(supabase).assertCanCreate({
      ip: await getClientIp(),
      email: booking.clientEmail,
      captchaToken: captchaToken ?? null,
    });

    const appointment = await useCase.execute({ ...booking, locale: toAppointmentLocale(locale) });
    return { success: true, appointmentId: appointment.id };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
