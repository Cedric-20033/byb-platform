// src/application/testimonials/SetTestimonialPublished.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';
import { requireTestimonial } from './requireTestimonial';

export type SetTestimonialPublishedInput = AdminActor & { testimonialId: string };

/** Base commune de PublishTestimonial / UnpublishTestimonial. Dépublier ne supprime rien : l'avis redevient un brouillon. */
abstract class SetTestimonialPublished {
  constructor(
    private readonly testimonialRepository: TestimonialRepository,
    private readonly auditLogger: AuditLogger,
    private readonly isPublished: boolean,
  ) {}

  async execute({ actorId, actorRole, testimonialId }: SetTestimonialPublishedInput): Promise<void> {
    const testimonial = await requireTestimonial(this.testimonialRepository, testimonialId);
    if (testimonial.isPublished === this.isPublished) return;

    await this.testimonialRepository.setPublished(testimonialId, this.isPublished);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.TESTIMONIAL_UPDATED,
      targetType: 'testimonial',
      targetId: testimonialId,
      metadata: { isPublished: this.isPublished },
    });
  }
}

export class PublishTestimonial extends SetTestimonialPublished {
  constructor(testimonialRepository: TestimonialRepository, auditLogger: AuditLogger) {
    super(testimonialRepository, auditLogger, true);
  }
}

export class UnpublishTestimonial extends SetTestimonialPublished {
  constructor(testimonialRepository: TestimonialRepository, auditLogger: AuditLogger) {
    super(testimonialRepository, auditLogger, false);
  }
}
