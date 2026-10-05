// e2e/auth.spec.ts
import { expect, test, type Page } from '@playwright/test';

/**
 * P1.4 — parcours d'authentification.
 *
 * Requiert des comptes de test (base Supabase locale ou projet de test) :
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD      un admin actif
 *   E2E_DISABLED_EMAIL / E2E_DISABLED_PASSWORD un admin désactivé (is_active = false)
 * Les tests dépourvus de leurs variables sont ignorés explicitement.
 *
 * La réinitialisation par email n'est pas bouclée ici (il faudrait lire la boîte
 * de test, ex. Mailpit) : seule la demande de lien et le rejet d'un lien invalide le sont.
 */
const admin = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const disabled = { email: process.env.E2E_DISABLED_EMAIL, password: process.env.E2E_DISABLED_PASSWORD };

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

test.describe('Connexion / déconnexion', () => {
  test.skip(!admin.email || !admin.password, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non définis');

  test('un admin se connecte puis se déconnecte', async ({ page }) => {
    await page.goto('/fr/login');
    await signIn(page, admin.email!, admin.password!);
    await expect(page).toHaveURL(/\/fr\/dashboard$/);

    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL(/\/fr\/login$/);

    // Session détruite : le dashboard n'est plus accessible.
    await page.goto('/fr/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('une redirection vers un site externe est ignorée après connexion', async ({ page, baseURL }) => {
    await page.goto('/fr/login?redirect=https://site-pirate.example');
    await signIn(page, admin.email!, admin.password!);

    await expect(page).toHaveURL(/\/fr\/dashboard$/);
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  });

  test('une page du dashboard demandée sans session est restituée après connexion', async ({ page }) => {
    await page.goto('/fr/dashboard/holidays');
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, admin.email!, admin.password!);
    await expect(page).toHaveURL(/\/fr\/dashboard\/holidays$/);
  });
});

test.describe('Compte désactivé', () => {
  test.skip(!disabled.email || !disabled.password, 'E2E_DISABLED_EMAIL / E2E_DISABLED_PASSWORD non définis');

  test('est refusé avec un message explicite et sans accès au dashboard', async ({ page }) => {
    await page.goto('/fr/login');
    await signIn(page, disabled.email!, disabled.password!);

    await expect(page.getByRole('alert')).toContainText('désactivé');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/fr/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Mot de passe oublié', () => {
  test('affiche la même confirmation que le compte existe ou non', async ({ page }) => {
    await page.goto('/fr/login');
    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
    await expect(page).toHaveURL(/\/fr\/forgot-password$/);

    await page.getByLabel('Email').fill('inconnu-e2e@example.com');
    await page.getByRole('button', { name: 'Envoyer le lien' }).click();

    await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte mail' })).toBeVisible();
  });

  test('un lien de réinitialisation invalide renvoie vers la connexion', async ({ page }) => {
    await page.goto('/fr/auth/callback?purpose=reset&token_hash=invalide');

    await expect(page).toHaveURL(/\/fr\/login\?error=invalidLink$/);
  });

  test("la page de réinitialisation ouverte sans session renvoie vers la connexion", async ({ page }) => {
    await page.goto('/fr/reset-password');

    await expect(page).toHaveURL(/\/fr\/login\?error=invalidLink$/);
  });
});
