// e2e/users.spec.ts
import { expect, test, type Page } from '@playwright/test';

/**
 * P1.5 — le superadmin invite un utilisateur depuis /dashboard/users.
 *
 * Requiert un superadmin de test : E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD.
 * La suite de l'invitation (clic sur le lien reçu, choix du mot de passe, connexion
 * avec les droits par défaut) exige une boîte mail de test (ex. Mailpit) : elle n'est
 * pas automatisée ici. Le compte invité reste en base de test : utiliser une base jetable.
 */
const email = process.env.E2E_SUPERADMIN_EMAIL;
const password = process.env.E2E_SUPERADMIN_PASSWORD;

async function loginAsSuperadmin(page: Page) {
  await page.goto('/fr/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/dashboard');
}

test.describe('Gestion des utilisateurs', () => {
  test.skip(!email || !password, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD non définis');

  test('le superadmin invite un admin, qui apparaît dans la liste ; une seconde invitation identique est refusée', async ({ page }) => {
    const invitedEmail = `e2e-${Date.now()}@example.com`;
    await loginAsSuperadmin(page);
    await page.goto('/fr/dashboard/users');

    async function invite() {
      await page.getByRole('button', { name: 'Inviter' }).click();
      await page.getByLabel('Nom complet').fill('Invité E2E');
      await page.getByLabel('Email', { exact: true }).fill(invitedEmail);
      await page.getByRole('button', { name: 'Envoyer l\'invitation' }).click();
    }

    await invite();
    await expect(page.getByText('Invitation envoyée.')).toBeVisible();
    await expect(page.getByText(invitedEmail)).toBeVisible();

    await invite();
    await expect(page.getByText('Un compte existe déjà avec cette adresse email.')).toBeVisible();
  });

  test('le superadmin ne peut agir ni sur son propre compte', async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/fr/dashboard/users');

    const ownRow = page.locator('div', { hasText: email! }).filter({ hasText: '(vous)' }).first();
    await expect(ownRow).toBeVisible();
    await expect(ownRow.getByRole('button', { name: 'Désactiver' })).toHaveCount(0);
  });
});
