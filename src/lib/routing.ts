// src/lib/routing.ts
import { defineRouting } from 'next-intl/routing';

/**
 * Configuration du routing i18n.
 *
 * localePrefix: 'always' — toutes les URLs ont un préfixe de locale :
 *   /fr/services, /en/services, /de/services
 *   La route / redirige automatiquement vers /fr
 *
 * Pourquoi 'always' plutôt que 'as-needed' ?
 *   - 'as-needed' masque /fr mais crée des ambiguïtés : / ne redirige pas
 *     automatiquement vers /fr dans tous les environnements.
 *   - 'always' est plus prévisible et évite les 404 sur la route racine.
 *
 * Pour ajouter une langue :
 *   1. Ajouter la locale dans ce tableau
 *   2. Créer messages/[locale].json
 *   3. Ajouter la clé optionnelle dans I18nField (src/types/index.ts)
 */
export const routing = defineRouting({
  locales: ['fr', 'en', 'de'],
  defaultLocale: 'fr',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

export function getLocalizedPath(path: string, locale: Locale) {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
