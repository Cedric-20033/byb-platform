// src/lib/testimonials/testimonialsComposition.ts
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { SupabaseTestimonialRepository } from '@/infrastructure/supabase/repositories/SupabaseTestimonialRepository';
import { createClient } from '@/infrastructure/supabase/server';

/**
 * Racine de composition des témoignages : instancie les adaptateurs concrets une seule fois par
 * requête, pour que les Server Actions n'en connaissent que les ports. Le client Supabase est celui de
 * l'appelant : la RLS reste la seconde barrière derrière `assertPermission()`.
 */
export async function createTestimonialDeps() {
  const supabase = await createClient();

  return {
    testimonials: new SupabaseTestimonialRepository(supabase),
    audit: new SupabaseAuditLogger(),
  };
}
