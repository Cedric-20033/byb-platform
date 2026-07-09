'use server';

// src/app/actions/booking/createAppointment.ts
import { createAppointmentSchema } from '@/lib/validation/appointment';
import { CreateAppointment } from '@/application/booking/CreateAppointment';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';

export type CreateAppointmentActionState =
  | { success: true; appointmentId: string }
  | { success: false; error: string };

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
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const supabase = createServiceRoleClient();

  const useCase = new CreateAppointment(
    new SupabaseAppointmentRepository(supabase),
    new SupabaseSlotRepository(supabase),
    new ResendEmailProvider(),
    new SupabaseAuditLogger(),
  );

  try {
    const appointment = await useCase.execute(parsed.data);
    return { success: true, appointmentId: appointment.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue.' };
  }
}
