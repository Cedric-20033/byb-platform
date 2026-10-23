// src/application/services/UpdateService.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { CatalogService, ServiceContent } from '@/domain/service/CatalogService';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { normalizeI18nText, type I18nTextInput } from '@/domain/shared/I18nText';
import { requireService } from './requireService';

export type UpdateServiceInput = AdminActor & {
  serviceId: string;
  name: I18nTextInput;
  shortDescription: I18nTextInput;
  fullDescription: I18nTextInput;
  icon: string;
};

const CONTENT_FIELDS = ['name', 'shortDescription', 'fullDescription', 'icon'] as const;

/**
 * Use case : modifie le contenu d'un service. Le slug n'est pas modifiable (URL publiques,
 * liens de réservation) ; l'ordre et l'activation ont leurs propres use cases.
 */
export class UpdateService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, serviceId, ...texts }: UpdateServiceInput): Promise<CatalogService> {
    const current = await requireService(this.serviceRepository, serviceId);

    const next: ServiceContent = {
      name: normalizeI18nText(texts.name),
      shortDescription: normalizeI18nText(texts.shortDescription),
      fullDescription: normalizeI18nText(texts.fullDescription),
      icon: texts.icon,
    };

    // L'audit liste les champs modifiés, pas leur contenu : les textes peuvent être longs
    // et la comparaison fine est consultable dans l'historique de l'application.
    const changedFields = CONTENT_FIELDS.filter((field) => JSON.stringify(current[field]) !== JSON.stringify(next[field]));
    if (changedFields.length === 0) return current;

    const updated = await this.serviceRepository.updateContent(serviceId, next);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: serviceId,
      metadata: { changedFields },
    });

    return updated;
  }
}
