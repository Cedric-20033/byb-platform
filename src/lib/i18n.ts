// src/lib/i18n.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * Configuration de next-intl pour le chargement des messages.
 * Chaque locale charge son propre fichier JSON depuis /messages/.
 * Le fallback sur 'fr' est géré par le routing ci-dessous.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fallback sur la locale par défaut si la locale est invalide
  if (!locale || !routing.locales.includes(locale as 'fr' | 'en' | 'de')) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});