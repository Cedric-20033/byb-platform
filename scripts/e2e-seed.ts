// scripts/e2e-seed.ts
//
// Jeu de données minimal des tests E2E (CI ou base de test locale) : les comptes que les specs attendent et un
// service actif visible sur le site. Idempotent : on peut le relancer sans dupliquer ni casser quoi que ce soit.
//
// Variables requises : NEXT_PUBLIC_SUPABASE_URL (ou E2E_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
// et un email + mot de passe par compte : E2E_ADMIN_*, E2E_SUPERADMIN_*, E2E_DISABLED_*.
// À lancer UNIQUEMENT sur une base jetable : il crée des comptes avec des mots de passe connus.
//   npx dotenv -e .env.test -- npm run e2e:seed
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

const url = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL (ou E2E_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY sont requis.');
}

const supabase = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

type Account = { variablePrefix: string; role: 'admin' | 'superadmin'; isActive: boolean };

/** Les trois profils que les specs utilisent : droits par défaut, tous les droits, et compte désactivé. */
const ACCOUNTS: Account[] = [
  { variablePrefix: 'E2E_ADMIN', role: 'admin', isActive: true },
  { variablePrefix: 'E2E_SUPERADMIN', role: 'superadmin', isActive: true },
  { variablePrefix: 'E2E_DISABLED', role: 'admin', isActive: false },
];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} est requise.`);
  return value;
}

/** Id d'un compte existant, par email : l'API d'administration n'offre pas de recherche directe. */
async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Liste des comptes : ${error.message}`);
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

async function ensureAccount({ variablePrefix, role, isActive }: Account): Promise<void> {
  const email = requiredEnv(`${variablePrefix}_EMAIL`);
  const password = requiredEnv(`${variablePrefix}_PASSWORD`);

  let userId = await findUserId(email);
  if (userId) {
    // Compte déjà présent (relance) : on rétablit le mot de passe attendu par les specs.
    const { error } = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) throw new Error(`Mise à jour de ${email} : ${error.message}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`Création de ${email} : ${error?.message ?? 'aucun compte renvoyé'}`);
    userId = data.user.id;
  }

  // Le trigger `handle_new_user` a créé le profil (rôle admin, droits par défaut) : on fixe le rôle et l'état voulus.
  const { error } = await supabase.from('profiles').update({ role, is_active: isActive }).eq('id', userId);
  if (error) throw new Error(`Profil de ${email} : ${error.message}`);
  console.log(`compte ${variablePrefix.replace('E2E_', '').toLowerCase()} : ${email} (${role}${isActive ? '' : ', désactivé'})`);
}

const CATALOGUE_SLUG = 'e2e-catalogue';

/** Un service actif avec une image de couverture : sans lui, plusieurs pages publiques n'ont rien à montrer. */
async function ensureCatalogue(): Promise<void> {
  const { data: existing, error: readError } = await supabase.from('services').select('id').eq('slug', CATALOGUE_SLUG).maybeSingle();
  if (readError) throw new Error(`Lecture du service : ${readError.message}`);

  let serviceId = existing?.id;
  if (!serviceId) {
    const { data, error } = await supabase
      .from('services')
      .insert({
        slug: CATALOGUE_SLUG,
        name: { fr: 'Service de test', en: 'Test service', de: 'Testservice' },
        short_description: { fr: 'Service créé pour les tests E2E.', en: 'Service created for E2E tests.', de: 'Für E2E-Tests erstellter Service.' },
        full_description: { fr: 'Service créé pour les tests E2E.', en: 'Service created for E2E tests.', de: 'Für E2E-Tests erstellter Service.' },
        icon: 'Hammer',
        is_active: true,
        order: 0,
      })
      .select('id')
      .single();
    if (error) throw new Error(`Création du service : ${error.message}`);
    serviceId = data.id;
  }

  const { count, error: countError } = await supabase.from('service_media').select('id', { count: 'exact', head: true }).eq('service_id', serviceId);
  if (countError) throw new Error(`Lecture des médias : ${countError.message}`);
  if (!count) {
    const { error } = await supabase
      .from('service_media')
      .insert({ service_id: serviceId, type: 'image', public_id: `byb/services/${CATALOGUE_SLUG}/cover`, is_cover: true, order: 0 });
    if (error) throw new Error(`Création de la couverture : ${error.message}`);
  }
  console.log(`catalogue : service « ${CATALOGUE_SLUG} » prêt`);
}

async function main(): Promise<void> {
  for (const account of ACCOUNTS) await ensureAccount(account);
  await ensureCatalogue();
}

main().catch((error) => {
  console.error('Échec du jeu de données E2E :', error instanceof Error ? error.message : error);
  process.exit(1);
});
