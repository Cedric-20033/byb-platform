// e2e/responsive.spec.ts
//
// P10.4 : la mise en page tient sur mobile (Pixel 7), tablette (820 px) et bureau, les trois projets Playwright.
// Ce qu'un test automatique sait vérifier : rien ne déborde de l'écran, la navigation reste atteignable, les
// cibles tactiles ne sont pas minuscules. Il ne juge pas la qualité visuelle : celle-là reste une revue à l'œil.
import { expect, test, type Page } from '@playwright/test';

const PUBLIC_PAGES = [
  '/fr',
  '/fr/services',
  '/fr/realisations',
  '/fr/a-propos',
  '/fr/contact',
  '/fr/rdv',
  '/fr/mentions-legales',
  '/fr/politique-confidentialite',
  '/en',
  '/de',
];

/** Largeur excédentaire de la page en pixels : > 0 = un défilement horizontal parasite. */
const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Un pixel de tolérance pour les arrondis de mise à l'échelle. */
const OVERFLOW_TOLERANCE_PX = 1;

/** Taille minimale d'une cible de pointeur, WCAG 2.2 niveau AA (critère 2.5.8). */
const MIN_TARGET_PX = 24;

/**
 * Attend que la mise en page soit stable : la page est chargée et les polices sont appliquées (elles changent les
 * largeurs). Volontairement pas `networkidle` : une page qui garde une requête ouverte (widget anti-robot, carte,
 * connexion longue) n'est jamais « inactive » et le test expirerait sans rien prouver.
 */
async function settleLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

test.describe('Pages publiques : pas de débordement horizontal', () => {
  for (const route of PUBLIC_PAGES) {
    test(`${route} tient dans la largeur de l'écran`, async ({ page }) => {
      await page.goto(route);
      await settleLayout(page);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
    });
  }
});

test.describe('Navigation et cibles tactiles', () => {
  test('la navigation est atteignable : liens visibles ou bouton de menu', async ({ page }) => {
    await page.goto('/fr');

    // Selon la largeur, le site affiche ses liens ou les replie derrière un bouton : l'un des deux doit être là.
    // (Sur grand écran, « Services » est un bouton de menu déroulant : on vérifie un lien simple, « Contact ».)
    const menuButton = page.getByRole('button', { name: 'Ouvrir le menu' });
    const desktopLink = page.getByRole('navigation').getByRole('link', { name: 'Contact' }).first();
    await expect(menuButton.or(desktopLink).first()).toBeVisible();
  });

  test('le lien Contact est atteignable, au besoin en ouvrant le menu', async ({ page }) => {
    await page.goto('/fr');
    // Large : la navigation est déjà déployée. Étroit : on ouvre d'abord le menu.
    const menuButton = page.getByRole('button', { name: 'Ouvrir le menu' });
    if (await menuButton.isVisible()) await menuButton.click();

    await expect(page.getByRole('link', { name: 'Contact' }).first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
  });

  test('les cibles du bouton de menu et du bouton flottant ne sont pas minuscules', async ({ page }) => {
    await page.goto('/fr');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    for (const target of [
      page.getByRole('button', { name: 'Ouvrir le menu' }),
      page.getByTestId('floating-cta'),
      page.getByTestId('floating-whatsapp'),
    ]) {
      if (!(await target.isVisible())) continue;
      const box = await target.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TARGET_PX);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    }
  });
});

test.describe('Assistant de réservation', () => {
  test('/fr/rdv : le titre et le premier choix sont visibles sans défilement horizontal', async ({ page }) => {
    await page.goto('/fr/rdv');

    await expect(page.getByRole('heading', { level: 1, name: 'Prenez rendez-vous en ligne' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quel service vous intéresse ?' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
  });
});

test.describe('Tableau de bord : pas de débordement de page', () => {
  const email = process.env.E2E_SUPERADMIN_EMAIL;
  const password = process.env.E2E_SUPERADMIN_PASSWORD;
  test.skip(!email || !password, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD non définis');

  test('les écrans principaux tiennent dans la largeur (les tableaux défilent dans leur cadre, pas la page)', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Mot de passe').fill(password!);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/dashboard');

    for (const route of ['/fr/dashboard', '/fr/dashboard/appointments', '/fr/dashboard/calendar', '/fr/dashboard/slots', '/fr/dashboard/holidays']) {
      await page.goto(route);
      await settleLayout(page);
      expect(await horizontalOverflow(page), route).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
    }
  });
});
