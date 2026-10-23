// src/domain/shared/Slug.ts
import { DomainError } from './DomainError';

export const MAX_SLUG_LENGTH = 80;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Transforme un texte en slug URL-safe : « Toiture Pentue » → « toiture-pentue ».
 * Les accents sont retirés (décomposition NFD) plutôt que supprimés avec leur lettre.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlug(value: string): boolean {
  return value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}

/** Lève `SLUG_INVALID` : un slug fait partie des URL publiques et ne tolère aucune approximation. */
export function assertValidSlug(value: string): void {
  if (!isValidSlug(value)) {
    throw new DomainError(`Slug invalide : "${value}"`, 'SLUG_INVALID');
  }
}
