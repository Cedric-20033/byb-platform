// e2e/booking-client-links.spec.ts
import { expect, test } from '@playwright/test';

/** UUID bien formé mais qui ne désigne aucun rendez-vous. */
const UNKNOWN_TOKEN = '00000000-0000-4000-8000-000000000000';

for (const [path, heading] of [
  ['annuler', 'Annuler mon rendez-vous'],
  ['modifier', 'Modifier mon rendez-vous'],
] as const) {
  test.describe(`Page /rdv/${path}/[token]`, () => {
    test('un jeton mal formé affiche « lien invalide »', async ({ page }) => {
      const response = await page.goto(`/fr/rdv/${path}/pas-un-jeton`);

      expect(response?.ok()).toBeTruthy();
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Lien invalide' })).toBeVisible();
    });

    test('un jeton inconnu affiche « lien invalide », sans révéler s\'il a existé', async ({ page }) => {
      await page.goto(`/fr/rdv/${path}/${UNKNOWN_TOKEN}`);

      await expect(page.getByRole('heading', { name: 'Lien invalide' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Nous contacter' })).toBeVisible();
    });

    test('la page n\'est pas indexée et ne transmet pas son URL aux sites tiers', async ({ page }) => {
      await page.goto(`/fr/rdv/${path}/${UNKNOWN_TOKEN}`);

      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    });

    test('est traduite dans les trois langues', async ({ page }) => {
      for (const [locale, text] of [
        ['en', 'Invalid link'],
        ['de', 'Ungültiger Link'],
      ] as const) {
        await page.goto(`/${locale}/rdv/${path}/${UNKNOWN_TOKEN}`);
        await expect(page.getByRole('heading', { name: text })).toBeVisible();
      }
    });
  });
}
