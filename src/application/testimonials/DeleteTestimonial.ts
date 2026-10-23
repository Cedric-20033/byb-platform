// src/application/testimonials/DeleteTestimonial.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';
import { requireTestimonial } from './requireTestimonial';

export type DeleteTestimonialInput = AdminActor & { testimonialId: string };

/** Use case : suppression DÉFINITIVE d'un témoignage. Pour le retirer du site sans le perdre, le dépublier suffit. */
export class DeleteTestimonial {
  constructor(
    private readonly testimonialRepository: TestimonialRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, testimonialId }: DeleteTestimonialInput): Promise<void> {
    const testimonial = await requireTestimonial(this.testimonialRepository, testimonialId);

    await this.testimonialRepository.delete(testimonialId);

    // Garde un ordre contigu 0..n-1 pour les témoignages restants.
    const remaining = (await this.testimonialRepository.findAll()).map((item) => item.id);
    await this.testimonialRepository.reorder(remaining);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.TESTIMONIAL_DELETED,
      targetType: 'testimonial',
      targetId: testimonialId,
      metadata: { authorName: testimonial.authorName, rating: testimonial.rating },
    });
  }
}
