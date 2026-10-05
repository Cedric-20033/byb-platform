// e2e/permissions.spec.ts
import { expect, test } from '@playwright/test';

/**
 * P1.6 — le superadmin règle les droits d'un admin depuis /dashboard/permissions.
 *
 * Requiert un superadmin de test (E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD)
 * et au moins un compte admin dans la base de test. Le module « Services » n'étant
 * pas encore construit (P3), on vérifie la persistance de la case « Rendez-vous —
 * Créer » ; le scénario « l'admin voit le bouton sans se reconnecter » sera ajouté
 * avec P3. Note : la barre latérale de l'admin édité ne se met à jour qu'au rechargement
 * de la page (le layout n'est pas rendu à chaque navigation) ; les gardes serveur,
 * elles, s'appliquent immédiatement.
 */
const email = process.env.E2E_SUPERADMIN_EMAIL;
const password = process.env.E2E_SUPERADMIN_PASSWORD;

test.describe('Gestion des permissions', () => {
  test.skip(!email || !password, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD non définis');

  test('une case cochée puis enregistrée persiste après rechargement ; l\'indicateur de modifications suit', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Mot de passe').fill(password!);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/fr/dashboard/permissions');
    const cell = page.getByLabel('Rendez-vous — Créer');
    await expect(cell).toBeVisible();

    const initial = await cell.isChecked();
    await cell.setChecked(!initial);
    await expect(page.getByText('1 modification non enregistrée')).toBeVisible();

    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Permissions mises à jour.')).toBeVisible();
    await expect(page.getByText('Aucune modification en attente.')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Rendez-vous — Créer')).toBeChecked({ checked: !initial });

    // Remise à l'état initial pour ne pas polluer la base de test.
    await page.getByLabel('Rendez-vous — Créer').setChecked(initial);
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Aucune modification en attente.')).toBeVisible();
  });
});
