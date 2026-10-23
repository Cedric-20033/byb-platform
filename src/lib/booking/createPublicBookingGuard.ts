// src/lib/booking/createPublicBookingGuard.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { PublicBookingGuard } from '@/application/booking/PublicBookingGuard';
import { createCaptchaVerifier } from '@/infrastructure/captcha/createCaptchaVerifier';
import { SupabaseRateLimiter } from '@/infrastructure/ratelimit/SupabaseRateLimiter';

/**
 * Assemble la protection des actions publiques de réservation. `supabase` doit être un client
 * service_role : la table des tentatives n'est accessible qu'au code serveur.
 */
export function createPublicBookingGuard(supabase: SupabaseClient<Database>): PublicBookingGuard {
  return new PublicBookingGuard(new SupabaseRateLimiter(supabase), createCaptchaVerifier(), {
    reportInfrastructureError: (error) => console.error('[PublicBookingGuard] Limiteur indisponible :', error),
  });
}
