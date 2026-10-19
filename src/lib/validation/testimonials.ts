// src/lib/validation/testimonials.ts
import { z } from 'zod';
import { isValidIsoDate } from '@/domain/shared/IsoDate';
import { MAX_RATING, MIN_RATING } from '@/domain/testimonial/TestimonialRules';

/**
 * Schémas de la gestion des témoignages (P6.2). Partagés entre le formulaire (zodResolver) et les
 * Server Actions ; les messages sont des CLÉS (cf. ./messages.ts), jamais des phrases.
 */

const AUTHOR_MAX = 100;
const CONTENT_MAX = 1500;

/** Texte traduisible : français obligatoire, EN/DE facultatifs (la chaîne vide est retirée par le domaine). */
const contentField = z.object({
  fr: z.string().trim().min(1, { error: 'frRequired' }).max(CONTENT_MAX, { error: 'textTooLong' }),
  en: z.string().trim().max(CONTENT_MAX, { error: 'textTooLong' }).optional(),
  de: z.string().trim().max(CONTENT_MAX, { error: 'textTooLong' }).optional(),
});

const idSchema = (error: string) => z.uuid({ error });

const orderedIdsSchema = z
  .array(idSchema('invalid'))
  .min(1, { error: 'invalid' })
  .max(200, { error: 'invalid' })
  .refine((ids) => new Set(ids).size === ids.length, { error: 'invalid' });

const testimonialContentShape = {
  authorName: z.string().trim().min(1, { error: 'authorNameRequired' }).max(AUTHOR_MAX, { error: 'textTooLong' }),
  authorLocation: z.string().trim().max(AUTHOR_MAX, { error: 'textTooLong' }).optional(),
  content: contentField,
  // Le formulaire convertit la valeur du <select> en nombre (`valueAsNumber`) avant la validation.
  rating: z
    .number({ error: 'ratingInvalid' })
    .int({ error: 'ratingInvalid' })
    .min(MIN_RATING, { error: 'ratingInvalid' })
    .max(MAX_RATING, { error: 'ratingInvalid' }),
  // Jour calendaire AAAA-MM-JJ existant (pas le 31 février).
  date: z.string().trim().refine(isValidIsoDate, { error: 'dateInvalid' }),
};

export const createTestimonialSchema = z.object(testimonialContentShape);

export const updateTestimonialSchema = z.object({
  testimonialId: idSchema('testimonialInvalid'),
  ...testimonialContentShape,
});

export const testimonialIdSchema = z.object({ testimonialId: idSchema('testimonialInvalid') });

export const reorderTestimonialsSchema = z.object({ orderedIds: orderedIdsSchema });

/** Valeurs de formulaire (saisie : EN/DE et la ville peuvent être absents). */
export type TestimonialFormValues = z.input<typeof createTestimonialSchema>;
