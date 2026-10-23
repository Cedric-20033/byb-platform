// src/lib/contact/createPublicContactGuard.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { PublicContactGuard } from '@/application/contact/PublicContactGuard';
import { createCaptchaVerifier } from '@/infrastructure/captcha/createCaptchaVerifier';
import { SupabaseRateLimiter } from '@/infrastructure/ratelimit/SupabaseRateLimiter';

/**
 * Assemble la protection du formulaire de contact. `supabase` doit être un client service_role :
 * la table des tentatives n'est accessible qu'au code serveur.
 */
export function createPublicContactGuard(supabase: SupabaseClient<Database>): PublicContactGuard {
  return new PublicContactGuard(new SupabaseRateLimiter(supabase), createCaptchaVerifier(), {
    reportInfrastructureError: (error) => console.error('[PublicContactGuard] Limiteur indisponible :', error),
  });
}
