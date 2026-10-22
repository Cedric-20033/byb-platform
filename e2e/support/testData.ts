// e2e/support/testData.ts
//
// Jeu de données reproductible des scénarios d'acceptation (P10.3).
//
// Chaque scénario crée SON service, ses créneaux et ses rendez-vous, puis supprime le tout : aucun test ne
// dépend de l'état de la base ni des autres tests, et deux workers (desktop / mobile) ne se marchent pas dessus.
//
// Accès direct à la base avec la clé service_role (jamais exposée au navigateur) :
//   E2E_SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY.
// À lancer contre une base de TEST (supabase locale ou projet dédié), jamais contre la production :
//   npx dotenv -e .env.test -- npm run test:e2e -- acceptance
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasDatabaseAccess = Boolean(url && serviceRoleKey);

export type SlotStatus = 'available' | 'booked' | 'blocked';

export type E2eWorld = {
  runId: string;
  serviceId: string;
  serviceName: string;
};

let cachedClient: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error('E2E_SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  }
  cachedClient ??= createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return cachedClient;
}

/** Lève une erreur lisible si l'écriture a échoué : un jeu de données incomplet fausserait tout le scénario. */
function expectOk(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context} : ${error.message}`);
}

/**
 * Date ISO (AAAA-MM-JJ) de « aujourd'hui + days » dans le fuseau de l'entreprise.
 * Calculée à midi UTC pour qu'aucun décalage horaire ne change le jour, et jamais avec la date locale de la machine.
 */
export function brusselsDatePlus(days: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Adresse de test : le domaine resend.dev accepte tout sans rebond et le suffixe « +… » la rend unique.
 * Les emails du site partent vraiment si RESEND_API_KEY est définie : voir l'avertissement du fichier de spec.
 */
export function uniqueEmail(world: E2eWorld, tag: string): string {
  return `delivered+e2e-${world.runId}-${tag}@resend.dev`;
}

/** Crée un service actif sans sous-prestation (le wizard saute alors directement au choix du créneau). */
export async function createWorld(): Promise<E2eWorld> {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const serviceName = `Service E2E ${runId}`;

  const { data, error } = await db()
    .from('services')
    .insert({
      slug: `e2e-${runId}`,
      name: { fr: serviceName },
      short_description: { fr: 'Service créé par les tests E2E.' },
      full_description: { fr: 'Service créé par les tests E2E.' },
      icon: 'Hammer',
      is_active: true,
      order: 9999,
    })
    .select('id')
    .single();
  expectOk(error, 'Création du service E2E');

  return { runId, serviceId: data!.id as string, serviceName };
}

export async function addSlot(world: E2eWorld, date: string, startTime: string, status: SlotStatus): Promise<string> {
  const endHour = String(Number(startTime.slice(0, 2)) + 1).padStart(2, '0');
  const { data, error } = await db()
    .from('slots')
    .insert({
      service_id: world.serviceId,
      date,
      start_time: startTime,
      end_time: `${endHour}:00:00`,
      status,
    })
    .select('id')
    .single();
  expectOk(error, 'Création du créneau E2E');
  return data!.id as string;
}

export async function addHoliday(world: E2eWorld, date: string): Promise<void> {
  const { error } = await db().from('holidays').insert({ date, label: `E2E ${world.runId}`, is_recurring: false });
  expectOk(error, 'Création du congé E2E');
}

/** Rendez-vous en attente sur un créneau déjà passé à « booked » (état normal après une réservation). */
export async function addPendingAppointment(
  world: E2eWorld,
  slotId: string,
  client: { name: string; email: string },
): Promise<string> {
  const { data, error } = await db()
    .from('appointments')
    .insert({
      slot_id: slotId,
      service_id: world.serviceId,
      client_name: client.name,
      client_email: client.email,
      client_phone: '+32 470 00 00 00',
      status: 'pending',
    })
    .select('id')
    .single();
  expectOk(error, 'Création du rendez-vous E2E');
  return data!.id as string;
}

export type StoredAppointment = { id: string; status: string; slotId: string; accessToken: string };

/** Le rendez-vous le plus récent d'une adresse email, ou `null` s'il n'y en a pas. */
export async function findAppointmentByEmail(email: string): Promise<StoredAppointment | null> {
  const { data, error } = await db()
    .from('appointments')
    .select('id, status, slot_id, access_token')
    .eq('client_email', email)
    .order('created_at', { ascending: false })
    .limit(1);
  expectOk(error, 'Lecture du rendez-vous E2E');
  const row = data?.[0];
  return row ? { id: row.id, status: row.status, slotId: row.slot_id, accessToken: row.access_token } : null;
}

export async function appointmentStatus(appointmentId: string): Promise<string | null> {
  const { data, error } = await db().from('appointments').select('status').eq('id', appointmentId).maybeSingle();
  expectOk(error, 'Lecture du statut du rendez-vous');
  return (data?.status as string | undefined) ?? null;
}

export async function slotStatus(slotId: string): Promise<SlotStatus | null> {
  const { data, error } = await db().from('slots').select('status').eq('id', slotId).maybeSingle();
  expectOk(error, 'Lecture du statut du créneau');
  return (data?.status as SlotStatus | undefined) ?? null;
}

/**
 * Efface les compteurs anti-abus de réservation : le quota par adresse IP (5 par 10 minutes) se déclencherait
 * sinon dès qu'on relance la suite. La table n'est accessible qu'au service_role.
 */
export async function clearBookingRateLimits(): Promise<void> {
  const { error } = await db().from('rate_limit_events').delete().like('key', 'booking:%');
  expectOk(error, 'Purge des compteurs anti-abus');
}

/**
 * Supprime tout ce que le scénario a créé. Les rendez-vous d'abord (la clé étrangère vers le service est en
 * « restrict »), puis le service, dont la suppression emporte ses créneaux. Le journal d'audit, immuable, garde
 * ses traces : c'est voulu.
 */
export async function destroyWorld(world: E2eWorld): Promise<void> {
  const client = db();
  const steps = [
    client.from('appointments').delete().eq('service_id', world.serviceId),
    client.from('holidays').delete().eq('label', `E2E ${world.runId}`),
  ];
  for (const step of steps) expectOk((await step).error, 'Nettoyage E2E');
  expectOk((await client.from('services').delete().eq('id', world.serviceId)).error, 'Nettoyage du service E2E');
}
