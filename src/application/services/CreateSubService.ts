// src/application/services/CreateSubService.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { CatalogSubService } from '@/domain/service/CatalogService';
import { nextOrder } from '@/domain/service/ServiceOrder';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import type { SubServiceRepository } from '@/domain/service/SubServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { normalizeI18nText, type I18nTextInput } from '@/domain/shared/I18nText';
import { assertValidSlug, slugify } from '@/domain/shared/Slug';
import { requireService } from './requireService';

export type CreateSubServiceInput = AdminActor & {
  serviceId: string;
  name: I18nTextInput;
  description: I18nTextInput;
  /** Facultatif : dérivé du nom français. Figé après création. */
  slug?: string;
};

/** Use case : ajoute une sous-prestation en fin de liste d'un service. */
export class CreateSubService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly subServiceRepository: SubServiceRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, serviceId, slug, ...texts }: CreateSubServiceInput): Promise<CatalogSubService> {
    const service = await requireService(this.serviceRepository, serviceId);

    const name = normalizeI18nText(texts.name);
    const finalSlug = slug?.trim() || slugify(name.fr);
    assertValidSlug(finalSlug);

    if (await this.subServiceRepository.slugExists(serviceId, finalSlug)) {
      throw new DomainError(`Slug déjà utilisé : ${finalSlug}`, 'SUB_SERVICE_SLUG_TAKEN');
    }

    const created = await this.subServiceRepository.create({
      serviceId,
      slug: finalSlug,
      name,
      description: normalizeI18nText(texts.description),
      order: nextOrder(service.subServices),
    });

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: serviceId,
      metadata: { scope: 'sub_service', operation: 'created', subServiceSlug: created.slug },
    });

    return created;
  }
}
