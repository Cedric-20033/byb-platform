'use server';

// src/app/actions/booking/rescheduleAppointment.ts
import { rescheduleAppointmentByTokenSchema } from '@/lib/validation/appointment';
import { GetClientAppointment } from '@/application/booking/GetClientAppointment';
import { RescheduleAppointmentByClient } from '@/application/booking/RescheduleAppointmentByClient';
import { RescheduleAppointment } from '@/application/admin/RescheduleAppointment';
import { DEFAULT_BOOKING_POLICY } from '@/domain/booking/BookingPolicy';
import { SupabaseAppointmentPlanner } from '@/infrastructure/supabase/repositories/SupabaseAppointmentPlanner';
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

export type RescheduleAppointmentByTokenActionState = { success: true } | ActionFailure;

/**
 * Déplacement par un visiteur vers un autre créneau du même service, via le lien reçu par email.
 *
 * Même principe que l'annulation : le jeton ouvre l'accès à UN rendez-vous, puis les use cases font
 * le travail. L'échange des créneaux est atomique côté base (fonction `reschedule_appointment`) ;
 * une course avec un autre visiteur sur le créneau visé se termine en `SLOT_UNAVAILABLE`.
 */
export async function rescheduleAppointmentByTokenAction(
  input: unknown,
): Promise<RescheduleAppointmentByTokenActionState> {
  try {
    const parsed = rescheduleAppointmentByTokenSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const supabase = createServiceRoleClient();
    await createPublicBookingGuard(supabase).assertCanUseToken({ ip: await getClientIp() });

    const emailProvider = new ResendEmailProvider();
    const slotRepository = new SupabaseSlotRepository(supabase);
    const useCase = new RescheduleAppointmentByClient(
      new GetClientAppointment(new SupabaseClientAppointmentAccess(supabase)),
      slotRepository,
      new RescheduleAppointment(
        new SupabaseAppointmentRepository(supabase),
        slotRepository,
        new SupabaseAppointmentPlanner(supabase),
        emailProvider,
        new SupabaseAuditLogger(),
      ),
      emailProvider,
      getAdminNotificationEmail(),
      DEFAULT_BOOKING_POLICY,
    );

    await useCase.execute(parsed.data);
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
