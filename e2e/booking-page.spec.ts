// e2e/booking-page.spec.ts
import { expect, test } from '@playwright/test';

test.describe('Page /rdv', () => {
  test('affiche l\'assistant pleine page à la première étape', async ({ page }) => {
    const response = await page.goto('/fr/rdv');

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { level: 1, name: 'Prenez rendez-vous en ligne' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quel service vous intéresse ?' })).toBeVisible();
  });

  test('ignore un service inconnu et repart du début', async ({ page }) => {
    const response = await page.goto('/fr/rdv?service=inconnu&sub=inconnue');

    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: 'Quel service vous intéresse ?' })).toBeVisible();
  });

  test('un service du catalogue saute l\'étape de choix du service', async ({ page }) => {
    // Récupère un slug réel depuis la liste publique plutôt que d'en supposer un.
    await page.goto('/fr/services');
    const href = await page.locator('a[href^="/fr/services/"]').first().getAttribute('href');
    const slug = href?.split('/').pop();
    test.skip(!slug, 'Aucun service actif dans la base de test.');

    await page.goto(`/fr/rdv?service=${slug}`);

    await expect(page.getByRole('heading', { name: 'Quel service vous intéresse ?' })).toHaveCount(0);
  });

  test('les boutons d\'ouverture en modale sont absents de la page', async ({ page }) => {
    await page.goto('/fr/rdv');
    await page.mouse.wheel(0, 1200);

    await expect(page.getByRole('button', { name: 'Prendre un RDV' })).toHaveCount(0);
  });
});
