// src/domain/testimonial/PublishedTestimonialReader.ts
import type { TestimonialRecord } from './TestimonialRecord';

/**
 * Port de lecture du site public : uniquement les témoignages publiés. Séparé de `TestimonialRepository`
 * (ISP) ; le filtre « publié » est une règle explicite, pas un effet de bord de la RLS (un admin connecté
 * verrait sinon les brouillons en parcourant le site).
 */
export interface PublishedTestimonialReader {
  /** Témoignages publiés, triés par `order`. */
  findPublished(): Promise<TestimonialRecord[]>;
}
