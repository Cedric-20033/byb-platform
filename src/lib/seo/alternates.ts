// src/lib/seo/alternates.ts
import type { Metadata } from 'next';
import { getLocalizedPath, routing, type Locale } from '@/lib/routing';

/**
 * Canonical et `hreflang` d'une page publique. Les URL sont relatives : Next les résout
 * avec `metadataBase` (défini dans app/[locale]/layout.tsx).
 * `x-default` pointe vers la langue de référence (français) pour les visiteurs hors des trois langues.
 *
 * @param path chemin sans préfixe de locale, par exemple '/services/toiture' ou '/' pour l'accueil
 */
export function buildLocaleAlternates(path: string, locale: string): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((code) => [code, getLocalizedPath(path, code)]),
  );

  return {
    canonical: getLocalizedPath(path, locale as Locale),
    languages: { ...languages, 'x-default': getLocalizedPath(path, routing.defaultLocale) },
  };
}
