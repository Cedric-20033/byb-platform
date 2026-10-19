// src/test/fakes/InMemoryTestimonialRepository.ts
import type { PublishedTestimonialReader } from '@/domain/testimonial/PublishedTestimonialReader';
import type { NewTestimonial, TestimonialContent, TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';

/** Témoignages en mémoire, triés par `order` comme le ferait la base. */
export class InMemoryTestimonialRepository implements TestimonialRepository, PublishedTestimonialReader {
  /** État brut, mutable : les tests peuvent y poser des données directement. */
  rows: TestimonialRecord[] = [];
  private sequence = 0;

  private requireRow(id: string): TestimonialRecord {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error(`Témoignage introuvable : ${id}`);
    return row;
  }

  private sorted(): TestimonialRecord[] {
    return [...this.rows].sort((a, b) => a.order - b.order).map((row) => ({ ...row }));
  }

  async findAll(): Promise<TestimonialRecord[]> {
    return this.sorted();
  }

  async findPublished(): Promise<TestimonialRecord[]> {
    return this.sorted().filter((row) => row.isPublished);
  }

  async findById(id: string): Promise<TestimonialRecord | null> {
    return this.sorted().find((row) => row.id === id) ?? null;
  }

  async create(draft: NewTestimonial): Promise<TestimonialRecord> {
    const row: TestimonialRecord = { id: `testimonial-${++this.sequence}`, ...draft };
    this.rows.push(row);
    return { ...row };
  }

  async updateContent(id: string, content: TestimonialContent): Promise<TestimonialRecord> {
    const row = this.requireRow(id);
    Object.assign(row, content);
    return { ...row };
  }

  async setPublished(id: string, isPublished: boolean): Promise<void> {
    this.requireRow(id).isPublished = isPublished;
  }

  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.id !== id);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => (this.requireRow(id).order = index));
  }
}
