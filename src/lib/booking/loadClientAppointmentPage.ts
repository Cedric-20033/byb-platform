// src/lib/booking/loadClientAppointmentPage.ts
import { GetClientAppointment } from '@/application/booking/GetClientAppointment';
import type { ClientAppointmentState } from '@/domain/appointment/ClientAppointmentAccess';
import { DomainError } from '@/domain/shared/DomainError';
import { getClientIp } from '@/infrastructure/http/getClientIp';
import { SupabaseClientAppointmentAccess } from '@/infrastructure/supabase/repositories/SupabaseClientAppointmentAccess';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import type { Locale } from '@/lib/routing';
import { cancelAppointmentByTokenSchema } from '@/lib/validation/appointment';
import { createPublicBookingGuard } from './createPublicBookingGuard';
import { toClientAppointmentSummary, type ClientAppointmentSummary } from './clientAppointmentSummary';

export type ClientAppointmentPageData =
  /** Jeton mal formé ou inconnu : même réponse dans les deux cas, pour ne rien révéler. */
  | { kind: 'invalid' }
  | { kind: 'rateLimited' }
  | { kind: 'found'; state: ClientAppointmentState; summary: ClientAppointmentSummary };

/**
 * Charge ce qu'affichent les pages `/rdv/annuler/[token]` et `/rdv/modifier/[token]`.
 * Composition côté serveur : le visiteur n'a pas de session, c'est le jeton qui l'autorise, avec
 * un quota par IP pour freiner le balayage de jetons.
 */
export async function loadClientAppointmentPage(token: string, locale: Locale): Promise<ClientAppointmentPageData> {
  if (!cancelAppointmentByTokenSchema.safeParse({ token }).success) return { kind: 'invalid' };

  const supabase = createServiceRoleClient();

  try {
    await createPublicBookingGuard(supabase).assertCanUseToken({ ip: await getClientIp() });
  } catch (error) {
    if (error instanceof DomainError && error.code === 'TOO_MANY_ATTEMPTS') return { kind: 'rateLimited' };
    throw error;
  }

  try {
    const { view, state } = await new GetClientAppointment(new SupabaseClientAppointmentAccess(supabase)).execute({ token });
    const services = await new SupabaseServiceRepository(supabase).findAll({ activeOnly: false });
    return { kind: 'found', state, summary: toClientAppointmentSummary(view, services, locale) };
  } catch (error) {
    if (error instanceof DomainError && error.code === 'APPOINTMENT_NOT_FOUND') return { kind: 'invalid' };
    throw error;
  }
}
