// e2e/smoke.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Smoke', () => {
  test('la page d\'accueil FR répond et s\'affiche', async ({ page }) => {
    const response = await page.goto('/fr');

    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });

  // Vérifie que le proxy (ex-middleware, renommé en Next 16) protège toujours le dashboard.
  test('le dashboard redirige vers la connexion sans session', async ({ page }) => {
    await page.goto('/fr/dashboard');

    await expect(page).toHaveURL(/login/);
  });
});
