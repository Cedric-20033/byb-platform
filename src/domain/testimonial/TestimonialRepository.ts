// src/domain/testimonial/TestimonialRepository.ts
import type { NewTestimonial, TestimonialContent, TestimonialRecord } from './TestimonialRecord';

/** Port d'écriture/lecture des témoignages. */
export interface TestimonialRepository {
  /** Tous les témoignages, publiés ou non, triés par `order`. */
  findAll(): Promise<TestimonialRecord[]>;
  findById(id: string): Promise<TestimonialRecord | null>;
  create(testimonial: NewTestimonial): Promise<TestimonialRecord>;
  updateContent(id: string, content: TestimonialContent): Promise<TestimonialRecord>;
  setPublished(id: string, isPublished: boolean): Promise<void>;
  delete(id: string): Promise<void>;
  /** Applique l'ordre 0..n-1 donné, en une seule opération atomique. */
  reorder(orderedIds: string[]): Promise<void>;
}
