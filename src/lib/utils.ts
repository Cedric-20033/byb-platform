// src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cloudinaryImageUrl, cloudinaryVideoUrl, cloudinaryVideoThumbnailUrl } from '@/lib/cloudinary-url';

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

// ─── Médias (images / vidéos) ─────────────────────────────────────────────────

/**
 * Point de passage UNIQUE pour tous les chemins d'images de l'application.
 *
 * Double compatibilité pendant la période de transition vers Cloudinary :
 *   - une valeur commençant par '/' est un chemin local dans /public
 *     (données pas encore migrées — cas actuel de src/data/services.ts)
 *   - toute autre valeur est traitée comme un public_id Cloudinary
 *     (nouvelles données, ou services.ts une fois le script de migration passé)
 *
 * Tous les composants appellent cette seule fonction → la migration complète
 * d'un service se résume à changer sa valeur dans data/, sans toucher au JSX.
 *
 * @example getImageUrl('/Images/services/toiture-cover.jpeg') → chemin local inchangé
 * @example getImageUrl('byb/services/toiture-cover')          → URL Cloudinary optimisée
 */
export function getImageUrl(path: string, options?: { width?: number; height?: number }): string {
  if (path.startsWith('/')) return path;
  return cloudinaryImageUrl(path, options);
}

/**
 * URL de lecture d'une vidéo. Contrairement aux images, les vidéos n'ont pas
 * d'équivalent local historique : elles passent systématiquement par Cloudinary.
 */
export function getVideoUrl(publicId: string): string {
  return cloudinaryVideoUrl(publicId);
}

/** Image fixe extraite d'une vidéo — utilisée comme aperçu avant lecture. */
export function getVideoThumbnailUrl(publicId: string): string {
  return cloudinaryVideoThumbnailUrl(publicId);
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