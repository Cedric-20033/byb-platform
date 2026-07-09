// src/infrastructure/supabase/serviceRoleClient.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Client Supabase avec la clé service_role — contourne délibérément le RLS.
 *
 *  USAGE STRICTEMENT SERVEUR (Server Actions, Route Handlers).
 * Ne jamais importer ce fichier dans un composant 'use client', ni exposer
 * SUPABASE_SERVICE_ROLE_KEY au navigateur.
 *
 * Réservé aux flux sans session utilisateur : réservation publique
 * (CreateAppointment) et annulation par token. Les flux admin utilisent
 * `server.ts` (session cookie + RLS) pour que les permissions RBAC s'appliquent.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
