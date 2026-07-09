// scripts/seed-slots.ts
//
// Remplit le calendrier de réservation pour la pré-production / le développement.
// À exécuter une fois (ou périodiquement) tant que le dashboard admin — qui
// exposera GenerateAvailableSlots via generateSlotsAction — n'est pas livré
// (Phase 3, étape 10). Utilise le client service_role : pas de session admin
// requise, c'est un script de maintenance exécuté directement par l'équipe technique.
//
// Usage : npx tsx scripts/seed-slots.ts
//
// Variables requises dans .env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Database } from '../src/types/database';
import { GenerateAvailableSlots } from '../src/application/admin/GenerateAvailableSlots';
import { SupabaseSlotRepository } from '../src/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { SupabaseHolidayRepository } from '../src/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { SupabaseAuditLogger } from '../src/infrastructure/audit/SupabaseAuditLogger';
import { ActorRole } from '../src/domain/shared/AuditLogger';
import { getActiveServices } from '../src/data/services';

// tsx n'exécute pas le chargement automatique de .env.local propre à Next.js —
// on le lit nous-mêmes s'il existe, sans introduire de dépendance supplémentaire.
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    if (!(key in process.env)) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
}

/**
 * Horaires d'ouverture par défaut de BYB Construction (voir data/company.ts :
 * "Lundi – Vendredi : 8h00 – 18h00"). À ajuster ici si le client communique
 * des horaires différents par service.
 */
const CONFIG = {
  daysAhead: 60,
  dailyStartTime: '08:00',
  dailyEndTime: '18:00',
  slotDurationMinutes: 60,
};

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local',
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const useCase = new GenerateAvailableSlots(
    new SupabaseSlotRepository(supabase),
    new SupabaseHolidayRepository(supabase),
    new SupabaseAuditLogger(),
  );

  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + CONFIG.daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Un même artisan ne peut pas être à deux endroits en même temps, mais le
  // schéma actuel lie chaque créneau à un service (voir le commentaire dans
  // la migration SQL) — on génère donc le même calendrier pour chaque service actif.
  for (const service of getActiveServices()) {
    const created = await useCase.execute({
      serviceId: service.slug,
      from,
      to,
      dailyStartTime: CONFIG.dailyStartTime,
      dailyEndTime: CONFIG.dailyEndTime,
      slotDurationMinutes: CONFIG.slotDurationMinutes,
      actorId: null,
      actorRole: ActorRole.SYSTEM,
    });
    console.log(`${service.slug} : ${created} créneau(x) créé(s)`);
  }
}

main()
  .then(() => {
    console.log('Génération des créneaux terminée.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Échec de la génération des créneaux :', error);
    process.exit(1);
  });
