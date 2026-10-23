// src/lib/settings/resolveBookingSettings.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { BookingPolicy } from '@/domain/booking/BookingPolicy';
import type { CompanySettings } from '@/domain/settings/CompanySettings';
import { GetCompanySettings } from '@/application/settings/GetCompanySettings';
import { SupabaseCompanySettingsRepository } from '@/infrastructure/supabase/repositories/SupabaseCompanySettingsRepository';
import { buildDefaultCompanySettings } from './defaultCompanySettings';

/** Ce dont les actions de réservation et de contact ont besoin : la politique et le destinataire interne. */
export type BookingRuntimeSettings = {
  policy: BookingPolicy;
  adminNotificationEmail: string;
};

export function toBookingPolicy(settings: CompanySettings): BookingPolicy {
  return {
    minNoticeMinutes: settings.booking.minNoticeMinutes,
    horizonDays: settings.booking.horizonDays,
    maxUpcomingPerEmail: settings.booking.maxUpcomingPerEmail,
    autoConfirm: settings.booking.confirmationMode === 'auto',
  };
}

/**
 * Réglages appliqués par les actions PUBLIQUES (réservation, annulation, déplacement, contact).
 * `supabase` est le client service_role de l'action : le visiteur n'a pas de session.
 *
 * Une base illisible ne doit pas empêcher un visiteur de réserver : on retombe sur les valeurs par
 * défaut et on journalise, plutôt que de renvoyer une erreur pour un réglage que le visiteur ne voit pas.
 */
export async function resolveBookingSettings(supabase: SupabaseClient<Database>): Promise<BookingRuntimeSettings> {
  const fallback = buildDefaultCompanySettings();

  try {
    const settings = await new GetCompanySettings(new SupabaseCompanySettingsRepository(supabase), fallback).execute();
    return { policy: toBookingPolicy(settings), adminNotificationEmail: settings.adminNotificationEmail };
  } catch (error) {
    console.error('[resolveBookingSettings] Réglages illisibles, valeurs par défaut utilisées :', error);
    return { policy: toBookingPolicy(fallback), adminNotificationEmail: fallback.adminNotificationEmail };
  }
}
