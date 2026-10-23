// src/lib/catalog/catalogComposition.ts
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { CloudinaryMediaUploader } from '@/infrastructure/cloudinary/CloudinaryMediaUploader';
import { SupabaseServiceCatalogRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceCatalogRepository';
import { SupabaseServiceMediaRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceMediaRepository';
import { SupabaseSubServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseSubServiceRepository';
import { createClient } from '@/infrastructure/supabase/server';

/**
 * Racine de composition du catalogue : instancie les adaptateurs concrets une seule fois par
 * requête, pour que les Server Actions n'en connaissent que les ports. Le client Supabase est
 * celui de l'appelant : la RLS reste la seconde barrière derrière `assertPermission()`.
 */
export async function createCatalogDeps() {
  const supabase = await createClient();
  const catalog = new SupabaseServiceCatalogRepository(supabase);

  return {
    services: catalog,
    usage: catalog,
    subServices: new SupabaseSubServiceRepository(supabase),
    media: new SupabaseServiceMediaRepository(supabase),
    uploader: new CloudinaryMediaUploader(),
    audit: new SupabaseAuditLogger(),
  };
}
