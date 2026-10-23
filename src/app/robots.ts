// src/app/robots.ts
import type { MetadataRoute } from 'next';
import { routing } from '@/lib/routing';
import { absoluteUrl } from '@/lib/seo/siteUrl';

/** Chemins sans contenu public : back-office, authentification et pages protégées par jeton. */
const PRIVATE_PATHS = [
  'dashboard',
  'login',
  'forgot-password',
  'reset-password',
  'accept-invitation',
  'auth',
  'rdv/annuler',
  'rdv/modifier',
];

export default function robots(): MetadataRoute.Robots {
  // Chaque chemin existe sous chaque préfixe de langue (/fr/dashboard, /en/dashboard…).
  const disallow = routing.locales.flatMap((locale) => PRIVATE_PATHS.map((path) => `/${locale}/${path}`));

  return {
    rules: { userAgent: '*', allow: '/', disallow },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
