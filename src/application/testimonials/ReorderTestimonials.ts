// src/application/testimonials/ReorderTestimonials.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { assertSamePermutation } from '@/domain/service/ServiceOrder';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';

export type ReorderTestimonialsInput = AdminActor & { orderedIds: string[] };

/** Use case : réordonne les témoignages (ordre d'affichage sur le site). */
export class ReorderTestimonials {
  constructor(
    private readonly testimonialRepository: TestimonialRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, orderedIds }: ReorderTestimonialsInput): Promise<void> {
    const current = (await this.testimonialRepository.findAll()).map((item) => item.id);
    assertSamePermutation(current, orderedIds, 'TESTIMONIAL_ORDER_INVALID');

    // Ordre inchangé : ni écriture ni ligne de journal.
    if (current.every((id, index) => id === orderedIds[index])) return;

    await this.testimonialRepository.reorder(orderedIds);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.TESTIMONIAL_UPDATED,
      targetType: 'testimonial',
      targetId: null,
      metadata: { scope: 'catalog', operation: 'reordered' },
    });
  }
}
