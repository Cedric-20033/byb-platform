// e2e/services.spec.ts
import { expect, test, type Page } from '@playwright/test';

/**
 * P3 — gestion du catalogue.
 *
 * Comptes requis (base Supabase locale ou projet de test) :
 *  - E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD : superadmin (tous les droits) ;
 *  - E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD : admin aux droits par défaut (`services.view` seul).
 * Sans ces variables, les tests sont ignorés explicitement plutôt que de passer à vide.
 *
 * Limite assumée : publier un service exige une image de couverture, donc un envoi réel vers
 * Cloudinary. Ce parcours (envoi → couverture → activation → visible sur /fr/services) reste
 * une vérification manuelle ; ici on couvre tout ce qui ne dépend pas du fournisseur média.
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

test.describe('Catalogue — superadmin', () => {
  test.skip(!superEmail || !superPassword, 'E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD non définis');

  test('crée un service archivé : listé en administration, absent du site public, non publiable sans image', async ({
    page,
  }) => {
    const name = `Service E2E ${Date.now()}`;
    await login(page, superEmail!, superPassword!);

    await page.goto('/fr/dashboard/services/new');
    await page.getByLabel('Nom').first().fill(name);
    await page.getByLabel('Description courte').first().fill('Description courte E2E.');
    await page.getByLabel('Description complète').first().fill('Description complète E2E.');
    await page.getByRole('button', { name: 'Créer le service' }).click();

    // Création → redirection vers la fiche du service, sous-prestations et médias désormais disponibles.
    await page.waitForURL(/\/fr\/dashboard\/services\/(?!new)[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Médias' })).toBeVisible();

    // Visible dans la liste d'administration, avec le statut « Archivé ».
    await page.goto('/fr/dashboard/services');
    const row = page.getByRole('listitem').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row.getByText('Archivé')).toBeVisible();

    // Un service sans image ne peut pas être publié : l'erreur métier est affichée.
    await row.getByRole('button', { name: 'Republier' }).click();
    await page.getByRole('button', { name: 'Confirmer' }).click();
    await expect(page.getByText(/image de couverture/i)).toBeVisible();

    // Et il n'apparaît pas sur le site public.
    await page.goto('/fr/services');
    await expect(page.getByText(name)).toHaveCount(0);

    // Nettoyage : suppression définitive (aucun rendez-vous ne le référence).
    await page.goto('/fr/dashboard/services');
    await page.getByRole('listitem').filter({ hasText: name }).getByRole('button', { name: 'Supprimer' }).click();
    await page.getByRole('button', { name: 'Confirmer' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(0);
  });
});

test.describe('Catalogue — admin sans droit de création', () => {
  test.skip(!adminEmail || !adminPassword, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non définis');

  test('ne voit pas le bouton d\'ajout et est refusé en accès direct au formulaire', async ({ page }) => {
    await login(page, adminEmail!, adminPassword!);

    await page.goto('/fr/dashboard/services');
    await expect(page.getByRole('heading', { name: 'Gestion des services' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ajouter un service' })).toHaveCount(0);

    await page.goto('/fr/dashboard/services/new');
    await expect(page).toHaveURL(/\/fr\/dashboard\/forbidden$/);
  });
});
