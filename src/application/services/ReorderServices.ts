// src/application/services/ReorderServices.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { assertSamePermutation } from '@/domain/service/ServiceOrder';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';

export type ReorderServicesInput = AdminActor & { orderedIds: string[] };

/** Use case : réordonne le catalogue (ordre d'affichage sur le site et dans l'assistant de réservation). */
export class ReorderServices {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, orderedIds }: ReorderServicesInput): Promise<void> {
    const current = (await this.serviceRepository.findAll()).map((service) => service.id);
    assertSamePermutation(current, orderedIds, 'SERVICE_ORDER_INVALID');

    // Ordre inchangé : ni écriture ni ligne de journal.
    if (current.every((id, index) => id === orderedIds[index])) return;

    await this.serviceRepository.reorder(orderedIds);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: null,
      metadata: { scope: 'catalog', operation: 'reordered' },
    });
  }
}
