// src/lib/seo/sitemapEntries.ts
import type { MetadataRoute } from 'next';
import { PUBLIC_ROUTES } from '@/lib/constants';
import { getLocalizedPath, routing } from '@/lib/routing';
import { absoluteUrl } from './siteUrl';

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Pages publiques indexables, avec leur priorité. Les pages à jeton (`/rdv/annuler/*`, `/rdv/modifier/*`)
 * sont volontairement absentes : elles sont privées et exclues par robots.txt.
 */
const STATIC_PAGES: ReadonlyArray<{ path: string; priority: number; changeFrequency: SitemapEntry['changeFrequency'] }> = [
  { path: PUBLIC_ROUTES.HOME, priority: 1, changeFrequency: 'weekly' },
  { path: PUBLIC_ROUTES.SERVICES, priority: 0.9, changeFrequency: 'weekly' },
  { path: PUBLIC_ROUTES.REALISATIONS, priority: 0.8, changeFrequency: 'weekly' },
  { path: PUBLIC_ROUTES.CONTACT, priority: 0.8, changeFrequency: 'yearly' },
  { path: PUBLIC_ROUTES.BOOKING, priority: 0.8, changeFrequency: 'monthly' },
  { path: PUBLIC_ROUTES.ABOUT, priority: 0.6, changeFrequency: 'yearly' },
  { path: PUBLIC_ROUTES.LEGAL, priority: 0.2, changeFrequency: 'yearly' },
  { path: PUBLIC_ROUTES.PRIVACY, priority: 0.2, changeFrequency: 'yearly' },
];

/**
 * Une entrée par page ET par langue : chacune déclare ses variantes (`alternates.languages`), ce que Google
 * attend pour relier les traductions entre elles (réciprocité des hreflang).
 */
function buildEntries(path: string, priority: number, changeFrequency: SitemapEntry['changeFrequency']): SitemapEntry[] {
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, absoluteUrl(getLocalizedPath(path, locale))]),
  );

  return routing.locales.map((locale) => ({
    url: absoluteUrl(getLocalizedPath(path, locale)),
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

/** Entrées du sitemap pour les pages statiques et les services actifs (`serviceSlugs`). */
export function buildSitemapEntries(serviceSlugs: readonly string[]): MetadataRoute.Sitemap {
  const staticEntries = STATIC_PAGES.flatMap(({ path, priority, changeFrequency }) =>
    buildEntries(path, priority, changeFrequency),
  );
  const serviceEntries = serviceSlugs.flatMap((slug) =>
    buildEntries(`${PUBLIC_ROUTES.SERVICES}/${slug}`, 0.7, 'monthly'),
  );
  return [...staticEntries, ...serviceEntries];
}
