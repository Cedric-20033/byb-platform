// src/application/testimonials/GetPublishedTestimonials.ts
import type { PublishedTestimonialReader } from '@/domain/testimonial/PublishedTestimonialReader';
import type { Testimonial } from '@/types';

/**
 * Use case : les témoignages publiés, dans la forme que le site public affiche (type `Testimonial`
 * de `@/types`). Le statut et le rang d'édition ne traversent pas cette frontière.
 */
export class GetPublishedTestimonials {
  constructor(private readonly reader: PublishedTestimonialReader) {}

  async execute(): Promise<Testimonial[]> {
    const records = await this.reader.findPublished();

    return records.map((record) => ({
      id: record.id,
      authorName: record.authorName,
      authorLocation: record.authorLocation,
      content: record.content,
      // La note est garantie 1..5 par le domaine et par la contrainte SQL.
      rating: record.rating as Testimonial['rating'],
      date: record.date,
      avatarImage: record.avatarPublicId ?? undefined,
    }));
  }
}
