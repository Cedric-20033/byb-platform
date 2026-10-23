// src/components/admin/testimonials/matchesTestimonialSearch.ts
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Recherche insensible à la casse et aux accents, sur l'auteur, sa ville et le texte (3 langues). */
export function matchesTestimonialSearch(
  testimonial: Pick<TestimonialRecord, 'authorName' | 'authorLocation' | 'content'>,
  query: string,
): boolean {
  const needle = normalize(query.trim());
  if (!needle) return true;

  return [
    testimonial.authorName,
    testimonial.authorLocation,
    testimonial.content.fr,
    testimonial.content.en,
    testimonial.content.de,
  ].some((value) => value !== undefined && normalize(value).includes(needle));
}
