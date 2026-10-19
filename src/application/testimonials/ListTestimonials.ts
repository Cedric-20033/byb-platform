// src/application/testimonials/ListTestimonials.ts
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';

/** Use case : tous les témoignages pour l'écran d'administration, brouillons compris. Lecture seule, sans audit. */
export class ListTestimonials {
  constructor(private readonly testimonialRepository: TestimonialRepository) {}

  execute(): Promise<TestimonialRecord[]> {
    return this.testimonialRepository.findAll();
  }
}
