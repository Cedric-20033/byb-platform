// e2e/language-switch.spec.ts
import { expect, test, type Page } from '@playwright/test';

/** Bouton visible du sélecteur de langue pour une langue cible (le libellé nomme la langue dans son propre nom). */
const switchTo = (page: Page, language: 'Français' | 'English' | 'Deutsch') =>
  page.locator(`button[aria-label*="${language}"]:visible`).first();

test.describe('Sélecteur de langue', () => {
  test('conserve la page courante en changeant de langue', async ({ page }) => {
    await page.goto('/fr/services');

    await switchTo(page, 'English').click();
    await expect(page).toHaveURL(/\/en\/services$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await switchTo(page, 'Deutsch').click();
    await expect(page).toHaveURL(/\/de\/services$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await switchTo(page, 'Français').click();
    await expect(page).toHaveURL(/\/fr\/services$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('traduit le contenu de la page après le changement', async ({ page }) => {
    await page.goto('/fr');
    const frenchTitle = await page.locator('h1').first().innerText();

    await switchTo(page, 'English').click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('h1').first()).not.toHaveText(frenchTitle);
  });

  test('déclare les alternates hreflang et le canonical', async ({ page }) => {
    await page.goto('/en/contact');

    for (const locale of ['fr', 'en', 'de', 'x-default']) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${locale}"]`)).toHaveCount(1);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/contact$/);
  });
});
