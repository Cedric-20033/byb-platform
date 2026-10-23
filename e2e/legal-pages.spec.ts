// e2e/legal-pages.spec.ts
import { expect, test, type Page } from '@playwright/test';

/** Domaines qu'une page ne doit jamais contacter d'elle-même : leur simple appel transmet l'IP du visiteur. */
const FORBIDDEN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.google.com', 'maps.googleapis.com', 'www.googletagmanager.com'];

function trackThirdPartyRequests(page: Page): string[] {
  const hosts: string[] = [];
  page.on('request', (request) => hosts.push(new URL(request.url()).hostname));
  return hosts;
}

test.describe('Politique de confidentialité', () => {
  test('est accessible et décrit les traitements, les droits et le recours', async ({ page }) => {
    const response = await page.goto('/fr/politique-confidentialite');

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeVisible();
    for (const heading of ['Responsable du traitement', 'Données collectées et finalités', 'Durées de conservation', 'Vos droits', 'Réclamation']) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
    await expect(page.getByText('Autorité de protection des données (APD)')).toBeVisible();
    await expect(page.getByText('BE1013632677').first()).toBeVisible();
  });

  test('est traduite dans les trois langues', async ({ page }) => {
    for (const [locale, title] of [
      ['fr', 'Politique de confidentialité'],
      ['en', 'Privacy policy'],
      ['de', 'Datenschutzerklärung'],
    ] as const) {
      await page.goto(`/${locale}/politique-confidentialite`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    }
  });

  test('a un titre et une description propres, et reste indexable', async ({ page }) => {
    await page.goto('/fr/politique-confidentialite');

    await expect(page).toHaveTitle(/Politique de confidentialité/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /données personnelles/);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  });

  test('est atteignable depuis le footer, sans page 404', async ({ page }) => {
    await page.goto('/fr');

    await page.locator('footer').getByRole('link', { name: 'Politique de confidentialité' }).click();

    await expect(page).toHaveURL(/\/fr\/politique-confidentialite$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeVisible();
  });

  test('est atteignable depuis les formulaires de contact et de réservation', async ({ page }) => {
    await page.goto('/fr/contact');
    await expect(page.locator('form').getByRole('link', { name: 'Politique de confidentialité' })).toHaveAttribute(
      'href',
      '/fr/politique-confidentialite',
    );
  });
});

test.describe('Mentions légales', () => {
  test('identifient l\'éditeur et renvoient vers la politique de confidentialité', async ({ page }) => {
    await page.goto('/fr/mentions-legales');

    await expect(page.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeVisible();
    await expect(page.getByText('BE1013632677')).toBeVisible();
    await expect(page.getByText('Koning Boudewijnlaan 20, 3500 Asselt')).toBeVisible();
    await expect(page.getByText('Rue Vaudrée 66, 4031 Liège')).toBeVisible();

    await page.getByRole('main').getByRole('link', { name: 'politique de confidentialité' }).click();
    await expect(page).toHaveURL(/\/fr\/politique-confidentialite$/);
  });

  test('n\'affirment aucun hébergeur tant que le client n\'en a pas désigné un', async ({ page }) => {
    await page.goto('/fr/mentions-legales');

    await expect(page.getByText('Vercel')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Hébergement' })).toHaveCount(0);
  });

  test('sont traduites dans les trois langues', async ({ page }) => {
    for (const [locale, title] of [
      ['en', 'Legal notice'],
      ['de', 'Impressum'],
    ] as const) {
      await page.goto(`/${locale}/mentions-legales`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    }
  });
});

test.describe('Aucune requête tierce automatique', () => {
  for (const route of ['/fr', '/fr/services', '/fr/contact', '/fr/politique-confidentialite']) {
    test(`${route} ne contacte ni Google ni un outil de mesure d'audience`, async ({ page }) => {
      const hosts = trackThirdPartyRequests(page);

      await page.goto(route);
      await page.waitForLoadState('networkidle');

      expect(hosts.filter((host) => FORBIDDEN_HOSTS.includes(host))).toEqual([]);
    });
  }

  test('une carte de la page contact ne contacte Google qu\'au clic', async ({ page }) => {
    const hosts = trackThirdPartyRequests(page);
    await page.goto('/fr/contact');
    await page.waitForLoadState('networkidle');
    expect(hosts).not.toContain('www.google.com');

    await page.getByRole('button', { name: 'Afficher la carte de BYB Asselt' }).click();

    await expect.poll(() => hosts.includes('www.google.com')).toBe(true);
  });
});
