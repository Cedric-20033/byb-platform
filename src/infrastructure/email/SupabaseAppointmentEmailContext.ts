// src/infrastructure/email/SupabaseAppointmentEmailContext.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { AppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import type { AppointmentEmailContext, AppointmentEmailContextResolver } from './AppointmentEmailContext';

type LocalizedName = Partial<Record<AppointmentLocale, string>> & { fr?: string };

type ContextRow = {
  access_token: string;
  slots: { date: string; start_time: string; end_time: string };
  services: { name: LocalizedName } | null;
  sub_services: { name: LocalizedName } | null;
};

/** Nom dans la langue demandée, repli sur le français (les traductions peuvent être incomplètes). */
function pickName(name: LocalizedName | null | undefined, locale: AppointmentLocale): string {
  return name?.[locale] || name?.fr || '';
}

/**
 * Lit en base le contexte d'un email de rendez-vous. Le client service_role est créé à la demande :
 * le provider d'emails est instancié dans des contextes où la clé n'est pas toujours disponible
 * (tests, scripts), et il n'en a besoin qu'au moment d'envoyer.
 */
export class SupabaseAppointmentEmailContext implements AppointmentEmailContextResolver {
  constructor(private readonly getClient: () => SupabaseClient<Database> = createServiceRoleClient) {}

  async resolve(appointmentId: string, locale: AppointmentLocale): Promise<AppointmentEmailContext | null> {
    const { data, error } = await this.getClient()
      .from('appointments')
      .select('access_token, slots!inner(date, start_time, end_time), services(name), sub_services(name)')
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    // Le typage généré des jointures est trop souple pour un `name` JSONB : on fixe la forme réellement lue.
    const row = data as unknown as ContextRow;
    return {
      accessToken: row.access_token,
      slot: { date: row.slots.date, startTime: row.slots.start_time, endTime: row.slots.end_time },
      serviceName: pickName(row.services?.name, locale),
      subServiceName: row.sub_services ? pickName(row.sub_services.name, locale) : null,
    };
  }
}
