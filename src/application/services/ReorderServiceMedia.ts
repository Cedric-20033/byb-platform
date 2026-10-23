// src/application/services/ReorderServiceMedia.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { assertSamePermutation } from '@/domain/service/ServiceOrder';
import type { ServiceMediaRepository } from '@/domain/service/ServiceMediaRepository';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { requireService } from './requireService';

export type ReorderServiceMediaInput = AdminActor & { serviceId: string; orderedIds: string[] };

/** Use case : réordonne la galerie d'un service (la couverture reste désignée séparément). */
export class ReorderServiceMedia {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly mediaRepository: ServiceMediaRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, serviceId, orderedIds }: ReorderServiceMediaInput): Promise<void> {
    const service = await requireService(this.serviceRepository, serviceId);
    const current = [...service.media].sort((a, b) => a.order - b.order).map((media) => media.id);

    assertSamePermutation(current, orderedIds, 'SERVICE_ORDER_INVALID');
    if (current.every((id, index) => id === orderedIds[index])) return;

    await this.mediaRepository.reorder(serviceId, orderedIds);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: serviceId,
      metadata: { scope: 'media', operation: 'reordered' },
    });
  }
}
