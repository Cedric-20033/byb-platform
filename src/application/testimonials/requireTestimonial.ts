// src/application/testimonials/requireTestimonial.ts
import { DomainError } from '@/domain/shared/DomainError';
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';

/** Charge un témoignage ou lève `TESTIMONIAL_NOT_FOUND` : point de départ commun des use cases d'édition. */
export async function requireTestimonial(
  repository: TestimonialRepository,
  testimonialId: string,
): Promise<TestimonialRecord> {
  const testimonial = await repository.findById(testimonialId);
  if (!testimonial) throw new DomainError(`Témoignage introuvable : ${testimonialId}`, 'TESTIMONIAL_NOT_FOUND');
  return testimonial;
}
