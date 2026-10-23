// e2e/performance.spec.ts
//
// P10.4 : exigence du cahier des charges, « temps de réponse inférieur à 2 secondes ».
//   - pages publiques : le document est exploitable (DOMContentLoaded) en moins de 2 s ;
//   - affichage des créneaux après le choix d'une date, et création d'un rendez-vous, en moins de 2 s.
//
// Ne s'exécute que sur un build de production : le serveur de développement compile chaque page à la demande
// et ses durées ne disent rien de ce que verra un visiteur.
//   npm run build && E2E_PRODUCTION=1 npm run test:e2e -- performance
// Budget modifiable pour une machine lente : E2E_PAGE_BUDGET_MS (défaut 2000).
import { expect, test, type Page } from '@playwright/test';
import {
  addSlot,
  brusselsDatePlus,
  clearBookingRateLimits,
  createWorld,
  destroyWorld,
  hasDatabaseAccess,
  uniqueEmail,
  type E2eWorld,
} from './support/testData';

const BUDGET_MS = Number(process.env.E2E_PAGE_BUDGET_MS ?? 2000);
const RUNS = 3;

test.skip(
  !process.env.E2E_PRODUCTION,
  'Les durées ne sont représentatives que sur un build de production (E2E_PRODUCTION=1) : le serveur de développement compile à la demande.',
);

const PAGES = ['/fr', '/fr/services', '/fr/realisations', '/fr/contact', '/fr/rdv', '/fr/politique-confidentialite'];

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

type PageTiming = { serverMs: number; readyMs: number };

/**
 * Mesuré par le navigateur lui-même (Navigation Timing) : `serverMs` = jusqu'au premier octet (réponse du serveur,
 * base de données comprise), `readyMs` = jusqu'à DOMContentLoaded. L'écart dit si la lenteur vient du serveur ou de la page.
 */
async function documentTiming(page: Page, route: string): Promise<PageTiming> {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  return page.evaluate(() => {
    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return {
      serverMs: navigation.responseStart - navigation.startTime,
      readyMs: navigation.domContentLoadedEventEnd - navigation.startTime,
    };
  });
}

test.describe('Temps de réponse des pages publiques', () => {
  for (const route of PAGES) {
    test(`${route} est exploitable en moins de ${BUDGET_MS} ms (médiane de ${RUNS} chargements)`, async ({ page }) => {
      // Premier chargement non mesuré : il paie le démarrage à froid du serveur et des connexions à la base.
      await page.goto(route);

      const timings: PageTiming[] = [];
      for (let run = 0; run < RUNS; run++) timings.push(await documentTiming(page, route));

      const ready = median(timings.map((timing) => timing.readyMs));
      const server = median(timings.map((timing) => timing.serverMs));
      test.info().annotations.push({
        type: 'durée',
        description: `prêt en ${Math.round(ready)} ms dont ${Math.round(server)} ms de réponse du serveur (essais : ${timings.map((timing) => Math.round(timing.readyMs)).join(', ')})`,
      });
      // Le message d'échec nomme la part du serveur : sans elle, un dépassement ne dit pas où chercher.
      expect(ready, `réponse du serveur : ${Math.round(server)} ms`).toBeLessThan(BUDGET_MS);
    });
  }
});

test.describe('Temps de réponse du parcours de réservation', () => {
  test.skip(!hasDatabaseAccess, 'SUPABASE_SERVICE_ROLE_KEY / E2E_SUPABASE_URL non définis : pas de jeu de données E2E.');
  test.skip(
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.startsWith('1x0'),
    'Un vrai captcha Turnstile est actif : utilisez une clé de test Cloudflare.',
  );
  test.describe.configure({ mode: 'serial' });

  const DAY_OFFSET = 3;
  let world: E2eWorld;

  test.beforeAll(async () => {
    world = await createWorld();
    await addSlot(world, brusselsDatePlus(DAY_OFFSET), '09:00:00', 'available');
    await clearBookingRateLimits();
  });

  test.afterAll(async () => {
    await destroyWorld(world);
  });

  test(`les créneaux s'affichent en moins de ${BUDGET_MS} ms après le choix d'une date, et la réservation aboutit en moins de ${BUDGET_MS} ms`, async ({ page }) => {
    await page.goto('/fr/rdv');
    await page.getByRole('button', { name: world.serviceName }).click();
    await expect(page.getByRole('heading', { name: 'Choisissez un créneau' })).toBeVisible();

    // Les boutons de date sont les seuls à porter aria-pressed ; le premier est aujourd'hui (heure de Bruxelles).
    const slotsStart = Date.now();
    await page.locator('button[aria-pressed]').nth(DAY_OFFSET).click();
    await page.getByRole('button', { name: '09:00', exact: true }).click({ timeout: BUDGET_MS });
    const slotsMs = Date.now() - slotsStart;

    await page.getByLabel('Nom complet').fill('Client Performance');
    await page.getByLabel('Email', { exact: true }).fill(uniqueEmail(world, 'perf'));
    await page.getByLabel('Téléphone').fill('+32 470 12 34 56');

    const bookingStart = Date.now();
    await page.getByRole('button', { name: 'Confirmer le rendez-vous' }).click();
    await expect(page.getByRole('heading', { name: 'Rendez-vous confirmé !' })).toBeVisible({ timeout: BUDGET_MS });
    const bookingMs = Date.now() - bookingStart;

    test.info().annotations.push({ type: 'durée', description: `créneaux ${slotsMs} ms, réservation ${bookingMs} ms` });
    expect(slotsMs).toBeLessThan(BUDGET_MS);
    expect(bookingMs).toBeLessThan(BUDGET_MS);
  });
});
