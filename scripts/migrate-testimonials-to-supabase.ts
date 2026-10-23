// scripts/migrate-testimonials-to-supabase.ts
//
// JEU DE SEED, PAS UN OUTIL D'EXPLOITATION (P6.2). Importe les témoignages de `src/data/testimonials.ts`
// dans la table `testimonials`. Après l'import, `src/data/testimonials.ts` n'est plus la source de
// vérité : les avis se gèrent depuis /dashboard/testimonials.
//
// ⚠ Les témoignages importés sont des DONNÉES FICTIVES de développement (voir l'en-tête de
// src/data/testimonials.ts). Ils sont importés PUBLIÉS à la demande explicite du client pour conserver
// l'affichage actuel du site. Publier de faux avis est une pratique commerciale trompeuse : les
// REMPLACER par de vrais avis (ou les dépublier depuis le dashboard) avant la mise en production
// (CLAUDE.md P11.8).
//
// Idempotent : un témoignage déjà présent (même auteur et même date) est ignoré, donc relancer le
// script ne crée pas de doublon et n'écrase pas les modifications faites au dashboard.
//
// Usage : npm run migrate:testimonials
//
// Variables requises dans .env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Database } from '../src/types/database';
import { testimonials } from '../src/data/testimonials';

// tsx n'exécute pas le chargement automatique de .env.local propre à Next.js : on le lit nous-mêmes.
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    if (!(key in process.env)) process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const supabase = createClient<Database>(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const { data: existing, error: readError } = await supabase
    .from('testimonials')
    .select('author_name, testimonial_date, order');
  if (readError) throw new Error(readError.message);

  const knownKeys = new Set(existing.map((row) => `${row.author_name}|${row.testimonial_date}`));
  // Les avis importés passent après ceux déjà saisis au dashboard.
  let nextOrder = existing.reduce((max, row) => Math.max(max, row.order + 1), 0);

  let inserted = 0;
  for (const item of testimonials) {
    if (knownKeys.has(`${item.authorName}|${item.date}`)) {
      console.log(`= déjà présent : ${item.authorName} (${item.date})`);
      continue;
    }

    const { error } = await supabase.from('testimonials').insert({
      author_name: item.authorName,
      author_location: item.authorLocation,
      content: item.content,
      rating: item.rating,
      testimonial_date: item.date,
      avatar_public_id: item.avatarImage ?? null,
      is_published: true,
      order: nextOrder++,
    });
    if (error) throw new Error(`${item.authorName} : ${error.message}`);

    inserted++;
    console.log(`+ importé : ${item.authorName} (${item.date})`);
  }

  console.log(`\nTerminé : ${inserted} témoignage(s) importé(s), ${testimonials.length - inserted} ignoré(s).`);
  if (inserted > 0) {
    console.warn(
      '\n⚠ Ces témoignages sont fictifs et PUBLIÉS. Remplacez-les par de vrais avis, ou dépubliez-les, avant la production.',
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
