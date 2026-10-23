// e2e/seo-security.spec.ts
import { expect, test } from '@playwright/test';

test.describe('SEO : fichiers pour les robots', () => {
  test('robots.txt est servi tel quel (pas redirigé vers une langue) et exclut le dashboard', async ({ request }) => {
    const response = await request.get('/robots.txt', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('Disallow: /fr/dashboard');
    expect(body).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });

  test('sitemap.xml est servi tel quel et déclare les trois langues de l\'accueil', async ({ request }) => {
    const response = await request.get('/sitemap.xml', { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    const body = await response.text();
    for (const locale of ['fr', 'en', 'de']) {
      expect(body).toMatch(new RegExp(`<loc>[^<]*/${locale}</loc>`));
    }
    expect(body).not.toMatch(/dashboard|login|annuler|modifier/);
  });
});

test.describe('Sécurité et supervision', () => {
  test('/api/health répond en JSON sans détail technique, jamais mis en cache', async ({ request }) => {
    const response = await request.get('/api/health', { maxRedirects: 0 });

    // 200 base joignable, 503 base injoignable : dans les deux cas, la forme du rapport est la même.
    expect([200, 503]).toContain(response.status());
    expect(response.headers()['cache-control']).toContain('no-store');
    const report = await response.json();
    expect(Object.keys(report).sort()).toEqual(['checks', 'status', 'timestamp']);
    expect(['ok', 'degraded']).toContain(report.status);
  });

  test('les pages publiques portent les en-têtes de sécurité', async ({ request }) => {
    const headers = (await request.get('/fr')).headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  // La CSP et HSTS ne sont émis qu'en production : à lancer contre `npm run build && npm start`.
  test('en production, la CSP interdit les cadres tiers non prévus', async ({ request }) => {
    test.skip(process.env.E2E_PRODUCTION !== '1', 'À exécuter contre un build de production (E2E_PRODUCTION=1).');

    const headers = (await request.get('/fr')).headers();

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['strict-transport-security']).toContain('max-age=');
  });
});
