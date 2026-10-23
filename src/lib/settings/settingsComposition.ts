// src/lib/settings/settingsComposition.ts
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { SupabaseCompanySettingsRepository } from '@/infrastructure/supabase/repositories/SupabaseCompanySettingsRepository';
import { createClient } from '@/infrastructure/supabase/server';
import { buildDefaultCompanySettings } from './defaultCompanySettings';

/**
 * Racine de composition des réglages (côté admin). Le client Supabase est celui de l'appelant : la RLS
 * (`settings.view` / `settings.edit`) reste la seconde barrière derrière `assertPermission()`.
 */
export async function createSettingsDeps() {
  const supabase = await createClient();

  return {
    settings: new SupabaseCompanySettingsRepository(supabase),
    audit: new SupabaseAuditLogger(),
    fallback: buildDefaultCompanySettings(),
  };
}
