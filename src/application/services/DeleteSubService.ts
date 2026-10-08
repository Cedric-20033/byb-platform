// src/application/services/DeleteSubService.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import type { SubServiceRepository } from '@/domain/service/SubServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { requireService } from './requireService';

export type DeleteSubServiceInput = AdminActor & { subServiceId: string };

/**
 * Use case : supprime une sous-prestation. Les rendez-vous qui la référencent la perdent sans
 * être supprimés (FK `on delete set null`) : la sous-prestation est un détail, pas une pièce d'historique.
 */
export class DeleteSubService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly subServiceRepository: SubServiceRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, subServiceId }: DeleteSubServiceInput): Promise<void> {
    const subService = await this.subServiceRepository.findById(subServiceId);
    if (!subService) throw new DomainError(`Sous-prestation introuvable : ${subServiceId}`, 'SUB_SERVICE_NOT_FOUND');

    await this.subServiceRepository.delete(subServiceId);

    // Garde un ordre contigu 0..n-1 pour les sous-prestations restantes.
    const service = await requireService(this.serviceRepository, subService.serviceId);
    await this.subServiceRepository.reorder(
      subService.serviceId,
      service.subServices.map((sub) => sub.id),
    );

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: subService.serviceId,
      metadata: { scope: 'sub_service', operation: 'deleted', subServiceSlug: subService.slug },
    });
  }
}
