// e2e/contact.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Page /contact', () => {
  test('affiche le formulaire et les coordonnées des deux sites', async ({ page }) => {
    const response = await page.goto('/fr/contact');

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/^Prénom/)).toBeVisible();
    await expect(page.getByText('Koning Boudewijnlaan 20').first()).toBeVisible();
    await expect(page.getByText('Rue Vaudrée 66').first()).toBeVisible();
  });

  test('ne charge aucune carte tant que le visiteur ne le demande pas', async ({ page }) => {
    await page.goto('/fr/contact');

    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Afficher la carte de BYB Asselt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Afficher la carte de BYB Liège' })).toBeVisible();
  });

  test('affiche une carte par site, centrée sur l\'adresse de CE site, après consentement', async ({ page }) => {
    await page.goto('/fr/contact');
    await page.getByRole('button', { name: 'Afficher la carte de BYB Asselt' }).click();
    await page.getByRole('button', { name: 'Afficher la carte de BYB Liège' }).click();

    const asselt = await page.getByTestId('site-map-asselt').locator('iframe').getAttribute('src');
    const liege = await page.getByTestId('site-map-liege').locator('iframe').getAttribute('src');

    expect(decodeURIComponent(asselt!)).toContain('Koning Boudewijnlaan 20, 3500 Asselt');
    expect(decodeURIComponent(liege!)).toContain('Rue Vaudrée 66, 4031 Liège');
    expect(asselt).not.toBe(liege);
  });

  test('porte un titre et une description propres, indexables', async ({ page }) => {
    await page.goto('/fr/contact');

    await expect(page).toHaveTitle(/Une question \? Un projet \?/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Asselt/);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  });

  test('un formulaire vide affiche des erreurs traduites et n\'envoie rien', async ({ page }) => {
    await page.goto('/fr/contact');

    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText('Adresse email invalide.')).toBeVisible();
    await expect(page.getByText('Votre message doit contenir au moins 10 caractères.')).toBeVisible();
  });

  test('les erreurs de saisie sont traduites dans les autres langues', async ({ page }) => {
    await page.goto('/en/contact');

    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText('Invalid email address.')).toBeVisible();
  });

  test('le formulaire est protégé par un piège à robots hors écran', async ({ page }) => {
    await page.goto('/fr/contact');

    const trap = page.locator('input[name="website"]');
    await expect(trap).toHaveCount(1);
    await expect(trap).toHaveAttribute('tabindex', '-1');
  });

  test('le bouton « Prendre un RDV » est disponible sur la page', async ({ page }) => {
    await page.goto('/fr/contact');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    await expect(page.getByTestId('floating-cta').locator('..')).not.toHaveAttribute('inert');
  });
});
