'use server';

// src/app/actions/contact/submitContactMessage.ts
import { contactMessageSchema } from '@/lib/validation/contact';
import { SubmitContactMessage } from '@/application/contact/SubmitContactMessage';
import { toAppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { getClientIp } from '@/infrastructure/http/getClientIp';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { createPublicContactGuard } from '@/lib/contact/createPublicContactGuard';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { resolveBookingSettings } from '@/lib/settings/resolveBookingSettings';

export type SubmitContactMessageActionState = { success: true } | ActionFailure;

/**
 * Formulaire de contact public. Composition root : protections (quotas, anti-robot), puis use case.
 *
 * Client service_role pour le seul limiteur de débit : le visiteur n'a pas de session, et rien d'autre
 * n'est lu ni écrit en base.
 */
export async function submitContactMessageAction(input: unknown): Promise<SubmitContactMessageActionState> {
  const parsed = contactMessageSchema.safeParse(input);
  if (!parsed.success) {
    return failure('VALIDATION_FAILED');
  }

  const { website, captchaToken, locale, ...message } = parsed.data;

  // Piège à robots : un humain ne voit pas ce champ. Faux succès, rien n'est envoyé : un refus
  // apprendrait au robot qu'il est détecté.
  if (website) {
    return { success: true };
  }

  try {
    const supabase = createServiceRoleClient();
    await createPublicContactGuard(supabase).assertCanSend({
      ip: await getClientIp(),
      email: message.email,
      captchaToken: captchaToken ?? null,
    });

    const emailProvider = new ResendEmailProvider();
    const { adminNotificationEmail } = await resolveBookingSettings(supabase);
    await new SubmitContactMessage(emailProvider, emailProvider, adminNotificationEmail).execute({
      ...message,
      locale: toAppointmentLocale(locale),
    });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
