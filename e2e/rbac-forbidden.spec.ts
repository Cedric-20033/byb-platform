// e2e/rbac-forbidden.spec.ts
import { expect, test } from '@playwright/test';

/**
 * P1.3 — un admin sans droit qui saisit l'URL d'une page réservée au
 * superadmin est renvoyé vers la page 403 localisée.
 *
 * Requiert un compte admin de test (base Supabase locale ou projet de test) :
 * E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. Sans ces variables, le test est ignoré
 * explicitement plutôt que de passer à vide.
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe('RBAC — accès par URL directe', () => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non définis');

  test('un admin tapant /fr/dashboard/users est redirigé vers la page 403', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Mot de passe').fill(password!);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/fr/dashboard/users');

    await expect(page).toHaveURL(/\/fr\/dashboard\/forbidden$/);
    await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible();
  });
});
