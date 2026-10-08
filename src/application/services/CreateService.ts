// src/application/services/CreateService.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { CatalogService } from '@/domain/service/CatalogService';
import { nextOrder } from '@/domain/service/ServiceOrder';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { DomainError } from '@/domain/shared/DomainError';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { normalizeI18nText, type I18nTextInput } from '@/domain/shared/I18nText';
import { assertValidSlug, slugify } from '@/domain/shared/Slug';

export type CreateServiceInput = AdminActor & {
  name: I18nTextInput;
  shortDescription: I18nTextInput;
  fullDescription: I18nTextInput;
  icon: string;
  /** Facultatif : dérivé du nom français. Figé après création. */
  slug?: string;
};

/**
 * Use case : crée un service, toujours INACTIF.
 * Un service sans image de couverture afficherait une image cassée sur le site public ;
 * il ne devient visible qu'à l'activation, qui exige une couverture (voir SetServiceActive).
 */
export class CreateService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, slug, icon, ...texts }: CreateServiceInput): Promise<CatalogService> {
    const name = normalizeI18nText(texts.name);
    const finalSlug = slug?.trim() || slugify(name.fr);
    assertValidSlug(finalSlug);

    if (await this.serviceRepository.slugExists(finalSlug)) {
      throw new DomainError(`Slug déjà utilisé : ${finalSlug}`, 'SERVICE_SLUG_TAKEN');
    }

    const existing = await this.serviceRepository.findAll();
    const created = await this.serviceRepository.create({
      slug: finalSlug,
      name,
      shortDescription: normalizeI18nText(texts.shortDescription),
      fullDescription: normalizeI18nText(texts.fullDescription),
      icon,
      isActive: false,
      order: nextOrder(existing),
    });

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_CREATED,
      targetType: 'service',
      targetId: created.id,
      metadata: { slug: created.slug, name: created.name.fr },
    });

    return created;
  }
}
