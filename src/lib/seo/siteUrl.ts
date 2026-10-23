// src/lib/seo/siteUrl.ts

/** Repli de développement : en production, `NEXT_PUBLIC_APP_URL` doit contenir le domaine public (sans slash final). */
const DEV_SITE_URL = 'http://localhost:3000';

/**
 * Origine publique du site. Source unique pour `metadataBase`, le sitemap, robots.txt et le JSON-LD :
 * ces trois sorties doivent annoncer exactement la même origine, sinon les moteurs ignorent les canonical.
 */
export function getSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || DEV_SITE_URL);
}

/** URL absolue d'un chemin du site (déjà préfixé par la locale, par exemple '/fr/services'). */
export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}
