// e2e/settings.spec.ts
import { expect, test, type Page } from '@playwright/test';

/**
 * P6.4 : réglages de l'entreprise (/dashboard/settings).
 *
 * Comptes requis (base Supabase locale ou projet de test, migration 0022 appliquée) :
 *  - E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD : superadmin (tous les droits) ;
 *  - E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD : admin aux droits par défaut (aucun droit sur `settings`).
 * Sans ces variables, les tests sont ignorés explicitement plutôt que de passer à vide.
 */
const superEmail = process.env.E2E_SUPERADMIN_EMAIL;
const superPassword = process.env.E2E_SUPERADMIN_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function login(page: Page, email: string, password: string) {
  await page.goto('/fr/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/dashboard');
}

async function savePhone(page: Page, phone: string) {
  await page.goto('/fr/dashboard/settings');
  await page.getByLabel('Téléphone', { exact: true }).fill(phone);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Paramètres enregistrés.')).toBeVisible();
}

test.describe('Réglages : superadmin', () => {
  test.skip(!superEmail || !superPassword, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD non définis');

  test('un numéro modifié apparaît sur le site public, puis est restauré', async ({ page }) => {
    const marker = '+32 400 99 88 77';
    await login(page, superEmail!, superPassword!);

    await page.goto('/fr/dashboard/settings');
    const original = await page.getByLabel('Téléphone', { exact: true }).inputValue();

    try {
      await savePhone(page, marker);

      // Le site public reflète le réglage (invalidation du cache à l'enregistrement).
      await page.goto('/fr/contact');
      await expect(page.getByRole('link', { name: marker })).toBeVisible();
    } finally {
      await savePhone(page, original);
    }
  });

  test('refuse un email de notification invalide sans enregistrer', async ({ page }) => {
    await login(page, superEmail!, superPassword!);
    await page.goto('/fr/dashboard/settings');

    await page.getByLabel('Email de notification').fill('pas-un-email');
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(page.getByText('Paramètres enregistrés.')).toHaveCount(0);
    await expect(page.getByText('Adresse email invalide.')).toBeVisible();
  });
});

test.describe('Réglages : admin sans droit', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non définis');

  test("n'a pas l'entrée de menu et est refusé en accès direct", async ({ page }) => {
    await login(page, adminEmail!, adminPassword!);

    await expect(page.getByRole('link', { name: 'Paramètres' })).toHaveCount(0);

    await page.goto('/fr/dashboard/settings');
    await expect(page).toHaveURL(/\/fr\/dashboard\/forbidden$/);
  });
});
