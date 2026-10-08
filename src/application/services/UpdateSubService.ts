// src/application/services/UpdateSubService.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { CatalogSubService } from '@/domain/service/CatalogService';
import type { SubServiceRepository } from '@/domain/service/SubServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { normalizeI18nText, type I18nTextInput } from '@/domain/shared/I18nText';

export type UpdateSubServiceInput = AdminActor & {
  subServiceId: string;
  name: I18nTextInput;
  description: I18nTextInput;
};

/** Use case : modifie le contenu d'une sous-prestation (son slug reste figé). */
export class UpdateSubService {
  constructor(
    private readonly subServiceRepository: SubServiceRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, subServiceId, ...texts }: UpdateSubServiceInput): Promise<CatalogSubService> {
    const current = await this.subServiceRepository.findById(subServiceId);
    if (!current) throw new DomainError(`Sous-prestation introuvable : ${subServiceId}`, 'SUB_SERVICE_NOT_FOUND');

    const next = { name: normalizeI18nText(texts.name), description: normalizeI18nText(texts.description) };
    const unchanged =
      JSON.stringify(current.name) === JSON.stringify(next.name) &&
      JSON.stringify(current.description) === JSON.stringify(next.description);
    if (unchanged) return current;

    const updated = await this.subServiceRepository.updateContent(subServiceId, next);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: current.serviceId,
      metadata: { scope: 'sub_service', operation: 'updated', subServiceSlug: current.slug },
    });

    return updated;
  }
}
