// e2e/acceptance.spec.ts
//
// P10.3 : critères d'acceptation du cahier des charges (§8), dans un vrai navigateur et sur une vraie base.
//
//   CA1 le client réserve un créneau disponible (UC-01)      CA4 l'annulation libère le créneau (UC-02)
//   CA2 les créneaux occupés ne sont pas sélectionnables      CA5 l'administrateur gère les rendez-vous (UC-03)
//   + jours fériés et congés qui bloquent la réservation, export CSV dont le contenu est vérifié.
//   CA3 (emails) : voir src/application/acceptance.test.ts. Un navigateur ne peut pas lire une boîte de réception ;
//   l'envoi réel est vérifié en recette (P11.3, P11.8).
//
// PRÉREQUIS : une base de TEST (supabase locale ou projet dédié), jamais la production.
//   - SUPABASE_SERVICE_ROLE_KEY et E2E_SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) : jeu de données (e2e/support).
//   - E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD : scénario d'administration.
//   - NEXT_PUBLIC_TURNSTILE_SITE_KEY absente, ou clé de test Cloudflare (1x00000000000000000000AA / 1x0000000000000000000000000000000AA) :
//     un vrai captcha ne se résout pas dans un test.
//   - ATTENTION : si RESEND_API_KEY est définie sur le serveur testé, de vrais emails partent, dont celui de
//     l'équipe (ADMIN_NOTIFICATION_EMAIL ou réglage de notification). Pointez-le vers une boîte de test.
// Lancement : npx dotenv -e .env.test -- npm run test:e2e -- acceptance
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  addHoliday,
  addPendingAppointment,
  addSlot,
  appointmentStatus,
  brusselsDatePlus,
  clearBookingRateLimits,
  createWorld,
  destroyWorld,
  findAppointmentByEmail,
  hasDatabaseAccess,
  slotStatus,
  uniqueEmail,
  type E2eWorld,
} from './support/testData';

test.skip(!hasDatabaseAccess, 'SUPABASE_SERVICE_ROLE_KEY / E2E_SUPABASE_URL non définis : pas de jeu de données E2E.');
test.skip(
  Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.startsWith('1x0'),
  'Un vrai captcha Turnstile est actif : utilisez une clé de test Cloudflare.',
);

const NO_SLOT_MESSAGE = "Aucun créneau disponible à cette date. Essayez un autre jour.";

/** Bouton d'un horaire (« 09:00 ») dans la grille de créneaux. */
const slotButton = (page: Page, time: string) => page.getByRole('button', { name: time, exact: true });

/**
 * Ouvre le wizard, choisit le service du scénario puis la date « aujourd'hui + dayOffset ».
 * Les boutons de date sont les seuls à porter `aria-pressed` ; le premier est aujourd'hui (heure de Bruxelles).
 */
async function openSlotStep(page: Page, world: E2eWorld, dayOffset: number) {
  await page.goto('/fr/rdv');
  await page.getByRole('button', { name: world.serviceName }).click();
  await expect(page.getByRole('heading', { name: 'Choisissez un créneau' })).toBeVisible();
  await page.locator('button[aria-pressed]').nth(dayOffset).click();
}

test.describe('Parcours client : réserver puis annuler (CA1, CA2, CA4)', () => {
  // Les étapes se suivent (réserver, puis constater, puis annuler) : on s'arrête dès qu'une étape échoue.
  test.describe.configure({ mode: 'serial' });

  const DAY_OFFSET = 3;
  let world: E2eWorld;
  let freeSlotId: string;
  let clientEmail: string;

  test.beforeAll(async () => {
    world = await createWorld();
    const date = brusselsDatePlus(DAY_OFFSET);
    freeSlotId = await addSlot(world, date, '09:00:00', 'available');
    await addSlot(world, date, '10:00:00', 'booked');
    await addSlot(world, date, '11:00:00', 'blocked');
    clientEmail = uniqueEmail(world, 'client');
    await clearBookingRateLimits();
  });

  test.afterAll(async () => {
    await destroyWorld(world);
  });

  test('CA2 : seul le créneau libre est proposé (ni le réservé, ni le bloqué)', async ({ page }) => {
    await openSlotStep(page, world, DAY_OFFSET);

    await expect(slotButton(page, '09:00')).toBeVisible();
    await expect(slotButton(page, '10:00')).toHaveCount(0);
    await expect(slotButton(page, '11:00')).toHaveCount(0);
  });

  test('CA1 : le client réserve le créneau et reçoit la confirmation', async ({ page }) => {
    await openSlotStep(page, world, DAY_OFFSET);
    await slotButton(page, '09:00').click();

    await expect(page.getByRole('heading', { name: 'Vos coordonnées' })).toBeVisible();
    await page.getByLabel('Nom complet').fill('Client Acceptation');
    await page.getByLabel('Email', { exact: true }).fill(clientEmail);
    await page.getByLabel('Téléphone').fill('+32 470 12 34 56');
    await page.getByRole('button', { name: 'Confirmer le rendez-vous' }).click();

    // Marge large : ce test vérifie le parcours, pas la vitesse (le budget de 2 s est celui de performance.spec.ts).
    await expect(page.getByRole('heading', { name: 'Rendez-vous confirmé !' })).toBeVisible({ timeout: 15_000 });

    // Côté base : le rendez-vous existe (en attente ou confirmé selon le réglage) et le créneau est pris.
    const stored = await findAppointmentByEmail(clientEmail);
    expect(stored?.slotId).toBe(freeSlotId);
    expect(['pending', 'confirmed']).toContain(stored?.status);
    expect(await slotStatus(freeSlotId)).toBe('booked');
  });

  test('CA2 : le créneau qui vient d\'être réservé n\'est plus proposé', async ({ page }) => {
    await openSlotStep(page, world, DAY_OFFSET);

    await expect(page.getByText(NO_SLOT_MESSAGE)).toBeVisible();
    await expect(slotButton(page, '09:00')).toHaveCount(0);
  });

  test('CA4 : le client annule par le lien de son email et le créneau est libéré', async ({ page }) => {
    const stored = await findAppointmentByEmail(clientEmail);
    expect(stored).not.toBeNull();

    await page.goto(`/fr/rdv/annuler/${stored!.accessToken}`);
    await page.getByRole('button', { name: 'Annuler le rendez-vous' }).click();
    await page.getByRole('button', { name: 'Oui, annuler' }).click();

    await expect(page.getByRole('heading', { name: 'Rendez-vous annulé' })).toBeVisible();
    expect(await appointmentStatus(stored!.id)).toBe('cancelled');
    expect(await slotStatus(freeSlotId)).toBe('available');

    // Le créneau est de nouveau proposé aux autres visiteurs.
    await openSlotStep(page, world, DAY_OFFSET);
    await expect(slotButton(page, '09:00')).toBeVisible();
  });
});

test.describe('Jours fériés et congés', () => {
  let world: E2eWorld;
  const DAY_OFFSET = 4;

  test.beforeAll(async () => {
    world = await createWorld();
    const date = brusselsDatePlus(DAY_OFFSET);
    // Le créneau est bien « available » en base : c'est le congé, et lui seul, qui doit le masquer.
    await addSlot(world, date, '09:00:00', 'available');
    await addHoliday(world, date);
  });

  test.afterAll(async () => {
    await destroyWorld(world);
  });

  test('un créneau tombant pendant un congé n\'est pas proposé à la réservation', async ({ page }) => {
    await openSlotStep(page, world, DAY_OFFSET);

    await expect(page.getByText(NO_SLOT_MESSAGE)).toBeVisible();
    await expect(slotButton(page, '09:00')).toHaveCount(0);
  });
});

test.describe('Administration : gérer les rendez-vous et exporter (CA5, UC-03)', () => {
  const superEmail = process.env.E2E_SUPERADMIN_EMAIL;
  const superPassword = process.env.E2E_SUPERADMIN_PASSWORD;

  test.skip(!superEmail || !superPassword, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD non définis');
  // Le tableau de bord est conçu pour le poste de travail : le parcours d'administration se vérifie sur desktop.
  test.skip(({ isMobile }) => isMobile, 'Parcours d\'administration vérifié sur desktop uniquement.');

  let world: E2eWorld;
  let slotId: string;
  let appointmentId: string;
  let clientEmail: string;
  const clientName = 'Client Admin E2E';

  test.beforeAll(async () => {
    world = await createWorld();
    slotId = await addSlot(world, brusselsDatePlus(5), '09:00:00', 'booked');
    clientEmail = uniqueEmail(world, 'admin');
    appointmentId = await addPendingAppointment(world, slotId, { name: clientName, email: clientEmail });
  });

  test.afterAll(async () => {
    await destroyWorld(world);
  });

  test('confirme une demande, exporte le CSV puis annule le rendez-vous', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByLabel('Email').fill(superEmail!);
    await page.getByLabel('Mot de passe').fill(superPassword!);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/dashboard');

    // La recherche isole le rendez-vous du test parmi ceux de la base.
    await page.goto('/fr/dashboard/appointments');
    await page.getByLabel('Recherche').fill(clientEmail);
    const row = page.getByRole('row').filter({ hasText: clientName });
    await expect(row).toBeVisible();

    // Confirmer : seul un rendez-vous en attente propose ce bouton.
    await row.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await expect(page.getByText('Rendez-vous confirmé.')).toBeVisible();
    expect(await appointmentStatus(appointmentId)).toBe('confirmed');

    // L'export respecte les filtres actifs : le fichier contient CE client, avec son statut traduit.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exporter en CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv).toContain(clientName);
    expect(csv).toContain(clientEmail);
    expect(csv).toContain('Confirmé');

    // Annuler : le créneau est libéré.
    await row.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Annuler ce rendez-vous ?' })).toBeVisible();
    await page.getByRole('button', { name: "Confirmer l'annulation" }).click();
    await expect(page.getByText('Rendez-vous annulé.')).toBeVisible();

    expect(await appointmentStatus(appointmentId)).toBe('cancelled');
    expect(await slotStatus(slotId)).toBe('available');
  });
});
