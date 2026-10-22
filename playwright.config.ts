// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Le rapport JSON alimente `scripts/check-no-skipped-tests.mjs` : aucun test ignoré sans justification.
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-results.json' }]]
    : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Le site est mobile-first : chaque scénario doit aussi passer sur petit écran.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // Tablette : Chromium à la taille d'un iPad (le profil `iPad` impose WebKit, à installer en plus). Limitée aux
    // scénarios qui dépendent de la mise en page : les parcours fonctionnels sont déjà joués en bureau et en mobile.
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
      testMatch: /(smoke|responsive|floating-cta)\.spec\.ts/,
    },
  ],
  // Lance le serveur de dev si aucune URL externe n'est fournie.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // E2E_PRODUCTION=1 : serveur de production (après `npm run build`), seul représentatif pour les durées,
        // la CSP et les en-têtes ; sinon serveur de développement.
        command: process.env.E2E_PRODUCTION ? 'npm run start' : 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
