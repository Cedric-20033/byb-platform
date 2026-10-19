// src/domain/testimonial/TestimonialRules.ts
import { DomainError } from '@/domain/shared/DomainError';

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/**
 * Une note est un entier de 1 à 5. Contrôle du domaine, en plus du schéma Zod et de la contrainte SQL :
 * un use case appelé hors d'une Server Action (script d'import, test) ne doit pas pouvoir y déroger.
 */
export function assertValidRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    throw new DomainError(`Note invalide : ${rating}`, 'TESTIMONIAL_RATING_INVALID');
  }
}
