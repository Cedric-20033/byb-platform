// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from './routing';

/**
 * Fusionne les classes Tailwind en évitant les conflits.
 * Utilisé dans tous les composants pour les classes conditionnelles.
 *
 * @example cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Type pour les champs traduisibles stockés en JSONB dans Supabase.
 * Toutes les colonnes de texte multilingue suivent cette structure.
 */
export type I18nField = {
  fr: string;
  en?: string;
  de?: string;
};

/**
 * Extrait la valeur traduite d'un champ i18n.
 * Applique un fallback sur le français si la traduction est absente.
 *
 * @param field - L'objet i18n avec les traductions disponibles
 * @param locale - La locale demandée
 * @returns La chaîne traduite, ou la valeur française par défaut
 */
export function t(field: I18nField, locale: Locale): string {
  return field[locale] ?? field.fr;
}

/**
 * Génère un slug URL-safe depuis une chaîne de caractères.
 * Utilisé pour les URLs des services, réalisations, etc.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formate une date en tenant compte de la locale active.
 *
 * @example formatDate('2025-06-23', 'fr') → '23 juin 2025'
 */
export function formatDate(date: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date);
}