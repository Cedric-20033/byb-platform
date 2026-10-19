// src/application/testimonials/UpdateTestimonial.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';
import { requireTestimonial } from './requireTestimonial';
import {
  buildTestimonialContent,
  TESTIMONIAL_CONTENT_FIELDS,
  type TestimonialContentInput,
} from './testimonialContent';

export type UpdateTestimonialInput = AdminActor & TestimonialContentInput & { testimonialId: string };

/** Use case : modifie le contenu d'un témoignage. La publication et l'ordre ont leurs propres use cases. */
export class UpdateTestimonial {
  constructor(
    private readonly testimonialRepository: TestimonialRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, testimonialId, ...input }: UpdateTestimonialInput): Promise<TestimonialRecord> {
    const current = await requireTestimonial(this.testimonialRepository, testimonialId);
    const next = buildTestimonialContent(input);

    // L'audit liste les champs modifiés, pas leur contenu : un avis peut être long.
    const changedFields = TESTIMONIAL_CONTENT_FIELDS.filter(
      (field) => JSON.stringify(current[field]) !== JSON.stringify(next[field]),
    );
    if (changedFields.length === 0) return current;

    const updated = await this.testimonialRepository.updateContent(testimonialId, next);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.TESTIMONIAL_UPDATED,
      targetType: 'testimonial',
      targetId: testimonialId,
      metadata: { changedFields },
    });

    return updated;
  }
}
