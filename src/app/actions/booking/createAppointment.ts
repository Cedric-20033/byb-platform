'use server';

// src/app/actions/booking/createAppointment.ts
import { createAppointmentSchema } from '@/lib/validation/appointment';
import { CreateAppointment } from '@/application/booking/CreateAppointment';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { company } from '@/data/company';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';

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

  const supabase = createServiceRoleClient();

  const useCase = new CreateAppointment(
    new SupabaseAppointmentRepository(supabase),
    new SupabaseSlotRepository(supabase),
    new ResendEmailProvider(),
    new SupabaseAuditLogger(),
    // Variable d'environnement prioritaire (permet de changer le destinataire
    // sans toucher au code) ; à défaut, l'email de contact de l'entreprise.
    process.env.ADMIN_NOTIFICATION_EMAIL ?? company.contact.email,
  );

  try {
    const appointment = await useCase.execute(parsed.data);
    return { success: true, appointmentId: appointment.id };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
