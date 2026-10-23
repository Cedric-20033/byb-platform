// src/test/integration/booking.integration.test.ts
//
// Concurrence et charge légère sur la réservation, avec les vrais repositories contre une vraie base.
// Les fakes en mémoire ne peuvent pas prouver ce que ce fichier prouve : c'est l'index unique de Postgres
// qui arbitre une course entre deux visiteurs, pas le code de l'application.
//
// Lancement : npm run test:integration (base locale `supabase start`, ou base de test dédiée).
// Budget de latence : LOAD_P95_BUDGET_MS (défaut 2000 ms, l'exigence du cahier des charges).
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@/types/database';
import { CreateAppointment } from '@/application/booking/CreateAppointment';
import { GetAvailableSlots } from '@/application/booking/GetAvailableSlots';
import { DEFAULT_BOOKING_POLICY } from '@/domain/booking/BookingPolicy';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseHolidayRepository } from '@/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import {
  addSlot,
  brusselsDatePlus,
  createWorld,
  destroyWorld,
  hasDatabaseAccess,
  uniqueEmail,
  type E2eWorld,
} from '../../../e2e/support/testData';

const BUDGET_MS = Number(process.env.LOAD_P95_BUDGET_MS ?? 2000);
const CONTENDED_DATE = brusselsDatePlus(3);
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const hourOf = (hour: number) => `${String(hour).padStart(2, '0')}:00:00`;

/** Exécute `count` tâches avec au plus `concurrency` en vol, et mesure la durée de chacune. */
async function runPool<T>(count: number, concurrency: number, task: (index: number) => Promise<T>) {
  const results = new Array<T>(count);
  const durations = new Array<number>(count);
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = next++;
      if (index >= count) return;
      const start = performance.now();
      results[index] = await task(index);
      durations[index] = performance.now() - start;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, worker));
  return { results, durations };
}

const percentile95 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];

describe('Réservation contre une base réelle', () => {
  let world: E2eWorld;
  let contendedSlotId: string;
  let createAppointment: CreateAppointment;
  let getAvailableSlots: GetAvailableSlots;
  let supabase: ReturnType<typeof createClient<Database>>;

  beforeAll(async () => {
    // Échec franc (et non test ignoré) si l'environnement manque : sans base, ce fichier ne prouve rien.
    if (!hasDatabaseAccess) {
      throw new Error('E2E_SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY sont requis.');
    }
    const url = (process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!;
    supabase = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

    const slots = new SupabaseSlotRepository(supabase);
    createAppointment = new CreateAppointment(
      new SupabaseAppointmentRepository(supabase),
      slots,
      new FakeEmailProvider(),
      new FakeAuditLogger(),
      'equipe@byb.test',
      DEFAULT_BOOKING_POLICY,
    );
    getAvailableSlots = new GetAvailableSlots(slots, new SupabaseHolidayRepository(supabase));

    // 1 créneau pour la course + 20 créneaux distincts (2 jours x 10 heures) pour la charge.
    world = await createWorld();
    contendedSlotId = await addSlot(world, CONTENDED_DATE, hourOf(7), 'available');
    for (const dayOffset of [4, 5]) {
      for (const hour of HOURS) await addSlot(world, brusselsDatePlus(dayOffset), hourOf(hour), 'available');
    }
  });

  afterAll(async () => {
    if (world) await destroyWorld(world);
  });

  const book = (slotId: string, tag: string) =>
    createAppointment.execute({
      slotId,
      serviceId: world.serviceId,
      clientName: 'Client Concurrent',
      clientEmail: uniqueEmail(world, tag),
      clientPhone: '+32 470 00 00 00',
    });

  it(`charge légère : 100 lectures de disponibilités, 20 en parallèle, p95 sous ${BUDGET_MS} ms`, async () => {
    const range = { serviceId: world.serviceId, from: brusselsDatePlus(0), to: brusselsDatePlus(10) };

    const { results, durations } = await runPool(100, 20, () => getAvailableSlots.execute(range));

    // Toutes les lectures voient le même calendrier : 1 créneau de course + 20 créneaux de charge.
    for (const found of results) expect(found).toHaveLength(21);
    expect(percentile95(durations)).toBeLessThan(BUDGET_MS);
  });

  it('20 réservations simultanées du même créneau : exactement une aboutit, les autres apprennent que le créneau est pris', async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => book(contendedSlotId, `race-${index}`)));

    const winners = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const losers = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
    expect(winners).toHaveLength(1);
    // Un échec « inattendu » (erreur Postgres brute) serait ici le défaut corrigé dans SupabaseAppointmentRepository.save.
    for (const loser of losers) expect(loser.reason).toMatchObject({ code: 'SLOT_UNAVAILABLE' });

    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('slot_id', contendedSlotId)
      .neq('status', 'cancelled');
    expect(count).toBe(1);
    const { data: slot } = await supabase.from('slots').select('status').eq('id', contendedSlotId).single();
    expect(slot?.status).toBe('booked');
  });

  it(`20 réservations sur 20 créneaux distincts : toutes aboutissent, p95 sous ${BUDGET_MS} ms`, async () => {
    const free = await getAvailableSlots.execute({ serviceId: world.serviceId, from: brusselsDatePlus(0), to: brusselsDatePlus(10) });
    expect(free).toHaveLength(20);

    const { durations } = await runPool(free.length, 20, (index) => book(free[index].id, `load-${index}`));

    expect(percentile95(durations)).toBeLessThan(BUDGET_MS);
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', world.serviceId)
      .neq('status', 'cancelled');
    expect(count).toBe(21);
  });
});
