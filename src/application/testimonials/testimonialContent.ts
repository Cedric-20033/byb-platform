// src/application/testimonials/testimonialContent.ts
import { normalizeI18nText, type I18nTextInput } from '@/domain/shared/I18nText';
import type { TestimonialContent } from '@/domain/testimonial/TestimonialRecord';
import { assertValidRating } from '@/domain/testimonial/TestimonialRules';

/** Saisie brute du contenu d'un témoignage, telle que validée par la Server Action. */
export type TestimonialContentInput = {
  authorName: string;
  authorLocation?: string;
  content: I18nTextInput;
  rating: number;
  date: string;
};

/** Normalise le contenu d'un témoignage et applique les règles du domaine (note de 1 à 5, français obligatoire). */
export function buildTestimonialContent(input: TestimonialContentInput): TestimonialContent {
  assertValidRating(input.rating);

  return {
    authorName: input.authorName.trim(),
    authorLocation: input.authorLocation?.trim() ?? '',
    content: normalizeI18nText(input.content),
    rating: input.rating,
    date: input.date,
  };
}

export const TESTIMONIAL_CONTENT_FIELDS = ['authorName', 'authorLocation', 'content', 'rating', 'date'] as const;
