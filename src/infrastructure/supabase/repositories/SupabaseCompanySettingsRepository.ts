// src/infrastructure/supabase/repositories/SupabaseCompanySettingsRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { BookingConfirmationMode, CompanySettings, CompanySite } from '@/domain/settings/CompanySettings';
import type { CompanySettingsRepository } from '@/domain/settings/CompanySettingsRepository';
import { toI18nText } from './catalogMappers';

type SettingsRow = Database['public']['Tables']['company_settings']['Row'];
type SettingsInsert = Database['public']['Tables']['company_settings']['Insert'];

/** Colonne `time` renvoyée en « HH:mm:ss » : le domaine manipule « HH:mm ». */
const toHourMinute = (time: string): string => time.slice(0, 5);

/** Les sites sont écrits par l'application sous la forme exacte de `CompanySite` ; on remet juste le pays en I18nText. */
function toSites(raw: SettingsRow['sites']): CompanySite[] {
  return (raw as unknown as (Omit<CompanySite, 'country'> & { country: unknown })[]).map((site) => ({
    ...site,
    country: toI18nText(site.country as SettingsRow['opening_hours']),
  }));
}

function toSettings(row: SettingsRow): CompanySettings {
  return {
    phone: row.phone,
    mobile: row.mobile,
    email: row.email,
    website: row.website,
    facebookUrl: row.facebook_url,
    instagramUrl: row.instagram_url,
    linkedinUrl: row.linkedin_url,
    openingHours: toI18nText(row.opening_hours),
    sites: toSites(row.sites),
    adminNotificationEmail: row.admin_notification_email,
    booking: {
      minNoticeMinutes: row.booking_min_notice_minutes,
      horizonDays: row.booking_horizon_days,
      maxUpcomingPerEmail: row.booking_max_upcoming_per_email,
      confirmationMode: row.booking_confirmation_mode as BookingConfirmationMode,
      defaultSlotMinutes: row.booking_default_slot_minutes,
      defaultStartTime: toHourMinute(row.booking_default_start_time),
      defaultEndTime: toHourMinute(row.booking_default_end_time),
    },
  };
}

function toRow(settings: CompanySettings): SettingsInsert {
  return {
    id: true,
    phone: settings.phone,
    mobile: settings.mobile,
    email: settings.email,
    website: settings.website,
    facebook_url: settings.facebookUrl,
    instagram_url: settings.instagramUrl,
    linkedin_url: settings.linkedinUrl,
    opening_hours: settings.openingHours,
    sites: settings.sites,
    admin_notification_email: settings.adminNotificationEmail,
    booking_min_notice_minutes: settings.booking.minNoticeMinutes,
    booking_horizon_days: settings.booking.horizonDays,
    booking_max_upcoming_per_email: settings.booking.maxUpcomingPerEmail,
    booking_confirmation_mode: settings.booking.confirmationMode,
    booking_default_slot_minutes: settings.booking.defaultSlotMinutes,
    booking_default_start_time: settings.booking.defaultStartTime,
    booking_default_end_time: settings.booking.defaultEndTime,
  };
}

/**
 * Réglages de l'entreprise (ligne unique `company_settings`, 0022).
 *
 * Côté admin, le client de l'appelant : la RLS (`settings.view` / `settings.edit`) double
 * `assertPermission()`. Côté public (réservation, contact), un client service_role : un visiteur n'a
 * pas de session et la table n'a volontairement aucune lecture publique.
 */
export class SupabaseCompanySettingsRepository implements CompanySettingsRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async get(): Promise<CompanySettings | null> {
    const { data, error } = await this.supabase.from('company_settings').select('*').eq('id', true).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSettings(data) : null;
  }

  async save(settings: CompanySettings): Promise<CompanySettings> {
    // Upsert sur la clé booléenne unique : crée la ligne au premier enregistrement, la remplace ensuite.
    const { data, error } = await this.supabase
      .from('company_settings')
      .upsert(toRow(settings), { onConflict: 'id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toSettings(data);
  }
}
