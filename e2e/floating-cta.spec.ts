// e2e/floating-cta.spec.ts
import { expect, test, type Locator, type Page } from '@playwright/test';

/** Pages publiques où le bouton « Prendre un RDV » doit exister. `/fr/page-inexistante` est la 404. */
const PUBLIC_ROUTES = [
  '/fr',
  '/fr/services',
  '/fr/realisations',
  '/fr/a-propos',
  '/fr/contact',
  '/fr/mentions-legales',
  '/fr/politique-confidentialite',
  '/fr/page-inexistante',
];

const cta = (page: Page) => page.getByTestId('floating-cta');
/** Le bouton est dans un conteneur qui porte l'attribut `inert` tant qu'il est caché. */
const ctaWrapper = (page: Page) => cta(page).locator('..');

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) =>
  !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);

async function box(locator: Locator): Promise<Box> {
  const result = await locator.boundingBox();
  if (!result) throw new Error('Élément sans boîte de rendu');
  return result;
}

test.describe('Bouton flottant « Prendre un RDV » : présence', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`est disponible en bas de ${route}`, async ({ page }) => {
      await page.goto(route);
      await scrollToBottom(page);

      await expect(cta(page)).toBeVisible();
      await expect(ctaWrapper(page)).not.toHaveAttribute('inert');
    });
  }

  test('est disponible sur la fiche d\'un service', async ({ page }) => {
    await page.goto('/fr/services');
    const href = await page.locator('a[href^="/fr/services/"]').first().getAttribute('href');
    test.skip(!href, 'Aucun service actif dans la base de test.');

    await page.goto(href!);
    await scrollToBottom(page);

    await expect(ctaWrapper(page)).not.toHaveAttribute('inert');
  });

  test('la 404 s\'affiche dans le site (navbar, footer) et en français', async ({ page }) => {
    await page.goto('/fr/page-inexistante');

    await expect(page.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    await expect(page.locator('nav').first()).toBeVisible();
  });

  for (const route of ['/fr/login', '/fr/dashboard']) {
    test(`est absent de ${route}`, async ({ page }) => {
      await page.goto(route);
      await scrollToBottom(page);

      await expect(cta(page)).toHaveCount(0);
    });
  }

  test('est absent de la page de réservation, qui contient déjà le wizard', async ({ page }) => {
    await page.goto('/fr/rdv');
    await scrollToBottom(page);

    await expect(cta(page)).toHaveCount(0);
  });
});

test.describe('Bouton flottant « Prendre un RDV » : comportement', () => {
  test('est caché, et inatteignable, en haut d\'une page longue', async ({ page }) => {
    await page.goto('/fr');

    await expect(ctaWrapper(page)).toHaveAttribute('inert', '');
  });

  test('apparaît au défilement puis ouvre le wizard', async ({ page }) => {
    await page.goto('/fr');
    await scrollToBottom(page);
    await expect(ctaWrapper(page)).not.toHaveAttribute('inert');

    await cta(page).click();

    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('est accessible au clavier : on l\'atteint avec Tab et on l\'active avec Entrée', async ({ page }) => {
    await page.goto('/fr/contact');
    await scrollToBottom(page);
    await expect(ctaWrapper(page)).not.toHaveAttribute('inert');

    const isFocused = () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'floating-cta');
    let reached = false;
    for (let presses = 0; presses < 200 && !reached; presses++) {
      await page.keyboard.press('Tab');
      reached = await isFocused();
    }
    expect(reached, 'le bouton doit faire partie de l\'ordre de tabulation').toBe(true);

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test.describe('Bouton flottant « Prendre un RDV » : ne masque rien', () => {
  for (const [name, viewport] of [
    ['bureau', { width: 1280, height: 800 }],
    ['mobile', { width: 375, height: 812 }],
  ] as const) {
    test.describe(name, () => {
      test.use({ viewport });

      test('ne recouvre ni le bouton WhatsApp ni le footer, tout en bas de la page', async ({ page }) => {
        await page.goto('/fr');
        await scrollToBottom(page);
        await expect(ctaWrapper(page)).not.toHaveAttribute('inert');
        // L'apparition est animée : on attend que le bouton ait atteint sa position finale.
        await expect.poll(async () => (await box(cta(page))).y + (await box(cta(page))).height).toBeLessThanOrEqual(viewport.height);

        const ctaBox = await box(cta(page));
        expect(intersects(ctaBox, await box(page.getByTestId('floating-whatsapp')))).toBe(false);

        const footerLinks = page.locator('footer a, footer p');
        for (let index = 0; index < (await footerLinks.count()); index++) {
          const link = footerLinks.nth(index);
          if (await link.isVisible()) expect(intersects(ctaBox, await box(link)), `lien de footer n°${index}`).toBe(false);
        }
      });
    });
  }
});
