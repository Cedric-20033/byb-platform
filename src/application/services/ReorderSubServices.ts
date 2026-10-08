// src/application/services/ReorderSubServices.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { assertSamePermutation } from '@/domain/service/ServiceOrder';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import type { SubServiceRepository } from '@/domain/service/SubServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { requireService } from './requireService';

export type ReorderSubServicesInput = AdminActor & { serviceId: string; orderedIds: string[] };

/** Use case : réordonne les sous-prestations d'un service (ordre d'affichage dans l'assistant de réservation). */
export class ReorderSubServices {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly subServiceRepository: SubServiceRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, serviceId, orderedIds }: ReorderSubServicesInput): Promise<void> {
    const service = await requireService(this.serviceRepository, serviceId);
    const current = [...service.subServices].sort((a, b) => a.order - b.order).map((sub) => sub.id);

    assertSamePermutation(current, orderedIds, 'SERVICE_ORDER_INVALID');
    if (current.every((id, index) => id === orderedIds[index])) return;

    await this.subServiceRepository.reorder(serviceId, orderedIds);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: serviceId,
      metadata: { scope: 'sub_service', operation: 'reordered' },
    });
  }
}
