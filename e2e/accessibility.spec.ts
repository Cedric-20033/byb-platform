// e2e/accessibility.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * P9.3 — WCAG 2.1 AA : aucune violation « critical » ou « serious » détectée par axe-core.
 * axe ne couvre qu'une partie des critères (environ un tiers) : ces tests protègent contre les
 * régressions mécaniques (étiquettes, contrastes, rôles ARIA), ils ne remplacent pas une revue manuelle au clavier.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const PUBLIC_PAGES = [
  '/fr',
  '/fr/services',
  '/fr/realisations',
  '/fr/a-propos',
  '/fr/contact',
  '/fr/rdv',
  '/fr/mentions-legales',
  '/fr/politique-confidentialite',
  '/fr/login',
  '/en',
  '/de',
];

async function blockingViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return violations
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    // Message lisible en cas d'échec : règle, gravité et premiers éléments fautifs.
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
    }));
}

/** Les cartes Google Maps ne se chargent qu'après consentement : rien de tiers n'est analysé ici. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Accessibilité — thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      // Le `ThemeProvider` maison lit ce réglage dans localStorage (clé `byb-theme`) à l'hydratation.
      await page.addInitScript((value) => window.localStorage.setItem('byb-theme', value), theme);
    });

    for (const route of PUBLIC_PAGES) {
      test(`${route} n'a aucune violation bloquante`, async ({ page }) => {
        await page.goto(route);
        await settle(page);

        // Garde-fou : un test « sombre » qui s'exécuterait en clair ne prouverait rien.
        if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);

        expect(await blockingViolations(page)).toEqual([]);
      });
    }
  });
}

test.describe('Accessibilité — interactions', () => {
  test('le lien d\'évitement est le premier élément atteint au clavier et mène au contenu', async ({ page }) => {
    await page.goto('/fr');
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: 'Aller au contenu principal' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('le wizard de réservation en modale n\'a aucune violation et rend le focus à son déclencheur', async ({ page }) => {
    await page.goto('/fr');
    await page.mouse.wheel(0, 1200);

    const trigger = page.getByTestId('floating-cta');
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('le focus reste piégé dans la modale du wizard', async ({ page }) => {
    await page.goto('/fr');
    await page.mouse.wheel(0, 1200);
    await page.getByTestId('floating-cta').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Quelques tabulations : le focus ne doit jamais quitter la boîte de dialogue.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await dialog.evaluate((node) => node.contains(document.activeElement));
      expect(inside).toBe(true);
    }
  });

  test('un visiteur qui préfère les animations réduites n\'a aucune transition active', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/fr');

    const duration = await page.evaluate(() => getComputedStyle(document.body).transitionDuration);
    expect(parseFloat(duration)).toBeLessThan(0.01);
  });
});

// Dashboard : mêmes identifiants que rbac-forbidden.spec.ts ; ignoré sans compte de test.
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe('Accessibilité — dashboard', () => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non définis');

  const DASHBOARD_PAGES = ['/fr/dashboard', '/fr/dashboard/appointments', '/fr/dashboard/calendar', '/fr/dashboard/slots'];

  test('les pages principales n\'ont aucune violation bloquante', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Mot de passe').fill(password!);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/dashboard');

    for (const route of DASHBOARD_PAGES) {
      await page.goto(route);
      await settle(page);
      expect(await blockingViolations(page), route).toEqual([]);
    }
  });
});
