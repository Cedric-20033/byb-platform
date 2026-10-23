// src/application/testimonials/CreateTestimonial.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { nextOrder } from '@/domain/service/ServiceOrder';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';
import { buildTestimonialContent, type TestimonialContentInput } from './testimonialContent';

export type CreateTestimonialInput = AdminActor & TestimonialContentInput;

/**
 * Use case : crée un témoignage, toujours en BROUILLON. Un avis n'apparaît sur le site qu'après une
 * publication volontaire : le client relit d'abord ce qu'il met sous son nom.
 */
export class CreateTestimonial {
  constructor(
    private readonly testimonialRepository: TestimonialRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, ...input }: CreateTestimonialInput): Promise<TestimonialRecord> {
    const content = buildTestimonialContent(input);
    const existing = await this.testimonialRepository.findAll();

    const created = await this.testimonialRepository.create({
      ...content,
      avatarPublicId: null,
      isPublished: false,
      order: nextOrder(existing),
    });

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.TESTIMONIAL_CREATED,
      targetType: 'testimonial',
      targetId: created.id,
      metadata: { authorName: created.authorName, rating: created.rating },
    });

    return created;
  }
}
