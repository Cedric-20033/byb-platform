// src/lib/routing.ts
import { defineRouting } from 'next-intl/routing';

/**
 * Définit les locales supportées et la locale par défaut.
 * Ajouter 'en' ou 'de' ici les active automatiquement dans toute l'application.
 *
 * Pour ajouter une nouvelle langue :
 *   1. Ajouter la locale dans le tableau `locales`
 *   2. Créer le fichier messages/[locale].json correspondant
 */
export const routing = defineRouting({
  locales: ['fr', 'en', 'de'],
  defaultLocale: 'fr',

  // Masque le préfixe /fr/ dans l'URL pour la locale par défaut
  // ex : /services au lieu de /fr/services pour les francophones
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];