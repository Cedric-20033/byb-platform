// src/lib/seo/seo.test.ts
import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { buildSitemapEntries } from './sitemapEntries';
import { getSiteUrl } from './siteUrl';
import { buildCompanyJsonLd, serializeJsonLd } from './structuredData';
import { toPublicCompanyInfo } from '@/lib/settings/publicCompanyInfo';
import { buildDefaultCompanySettings } from '@/lib/settings/defaultCompanySettings';

describe('sitemap', () => {
  const entries = buildSitemapEntries(['toiture']);
  const origin = getSiteUrl().origin;

  it('contient chaque page dans les trois langues', () => {
    const urls = entries.map((entry) => entry.url);
    for (const locale of ['fr', 'en', 'de']) {
      expect(urls).toContain(`${origin}/${locale}`);
      expect(urls).toContain(`${origin}/${locale}/services/toiture`);
    }
  });

  it('déclare les variantes de langue de chaque entrée', () => {
    const home = entries.find((entry) => entry.url.endsWith('/fr'));
    expect(Object.keys(home?.alternates?.languages ?? {})).toEqual(['fr', 'en', 'de']);
  });

  it('exclut les pages privées', () => {
    const urls = entries.map((entry) => entry.url).join(' ');
    expect(urls).not.toMatch(/dashboard|login|annuler|modifier/);
  });
});

describe('robots', () => {
  it('interdit le dashboard et les pages à jeton dans chaque langue, et référence le sitemap', () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.disallow).toEqual(expect.arrayContaining(['/fr/dashboard', '/en/login', '/de/rdv/annuler']));
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe('JSON-LD', () => {
  const info = toPublicCompanyInfo(buildDefaultCompanySettings());
  const data = buildCompanyJsonLd(info, 'fr');

  it('décrit une entreprise avec un département par site', () => {
    expect(data['@type']).toBe('GeneralContractor');
    expect(data.department).toHaveLength(info.sites.length);
  });

  it('omet les champs vides', () => {
    expect(data).not.toHaveProperty('sameAs');
  });

  it("échappe '<' pour qu'un champ ne puisse pas fermer la balise script", () => {
    expect(serializeJsonLd({ name: '</script><img>' })).not.toContain('<');
  });
});
