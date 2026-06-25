// src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Fusionne les classes Tailwind en résolvant les conflits.
 * Fonction existante — inchangée.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── I18n ─────────────────────────────────────────────────────────────────────

/**
 * Champ traduisible stocké en JSONB dans Supabase.
 * Le français est obligatoire. Les autres langues sont des fallbacks.
 *
 * Pour ajouter une langue : ajouter la clé ici ET dans src/lib/routing.ts.
 */
export type I18nField = {
  fr: string;
  en?: string;
  de?: string;
};

/**
 * Extrait la valeur traduite d'un champ I18nField avec fallback sur le français.
 * Utilisé dans tous les composants pour afficher les données multilingues de src/data/.
 *
 * @example t(service.name, 'en') → "Roofing"
 * @example t(service.name, 'zh') → "Toiture" (fallback fr)
 */
export function t(field: I18nField, locale: string): string {
  return (field as Record<string, string>)[locale] ?? field.fr;
}

// ─── Images ───────────────────────────────────────────────────────────────────

/**
 * Point de passage UNIQUE pour tous les chemins d'images de l'application.
 *
 * Aujourd'hui (Phase 1-2) : retourne le chemin /public tel quel.
 * Phase 3 (Cloudinary) : modifier UNIQUEMENT cette fonction.
 * Tous les composants l'utilisent → un seul changement met à jour tout le site.
 *
 * @example getImageUrl('/images/services/toiture.jpg')
 *   → aujourd'hui : '/images/services/toiture.jpg'
 *   → phase 3     : 'https://res.cloudinary.com/byb/image/upload/services/toiture.jpg'
 */
export function getImageUrl(path: string): string {
  // TODO Phase 3 : décommenter et configurer Cloudinary
  // const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  // if (cloud) return `https://res.cloudinary.com/${cloud}/image/upload${path}`;
  return path;
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Transforme une chaîne en slug URL-safe.
 * "Toiture Pentue" → "toiture-pentue"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formate une date ISO selon la locale active.
 * @example formatDate('2024-10-15', 'fr') → "15 octobre 2024"
 */
export function formatDate(date: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date);
}