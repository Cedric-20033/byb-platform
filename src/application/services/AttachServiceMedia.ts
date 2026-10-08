// src/application/services/AttachServiceMedia.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { CatalogMedia } from '@/domain/service/CatalogService';
import { assertInServiceFolder } from '@/domain/service/MediaRules';
import { nextOrder } from '@/domain/service/ServiceOrder';
import type { ServiceMediaRepository } from '@/domain/service/ServiceMediaRepository';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { MediaKind } from '@/domain/shared/MediaProvider';
import { requireService } from './requireService';

export type AttachServiceMediaInput = AdminActor & {
  serviceId: string;
  kind: MediaKind;
  publicId: string;
};

/**
 * Use case : enregistre un média que le navigateur vient d'envoyer au stockage.
 * Le premier média image d'un service devient sa couverture. Idempotent : ré-enregistrer
 * un public_id déjà rattaché renvoie le média existant (double clic, nouvel essai réseau).
 */
export class AttachServiceMedia {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly mediaRepository: ServiceMediaRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, serviceId, kind, publicId }: AttachServiceMediaInput): Promise<CatalogMedia> {
    const service = await requireService(this.serviceRepository, serviceId);
    assertInServiceFolder(publicId, service.slug);

    const existing = service.media.find((media) => media.publicId === publicId);
    if (existing) return existing;

    const media = await this.mediaRepository.add({
      serviceId,
      type: kind,
      publicId,
      order: nextOrder(service.media),
      isCover: kind === 'image' && !service.media.some((m) => m.isCover),
    });

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: serviceId,
      metadata: { scope: 'media', operation: 'attached', type: kind, publicId },
    });

    return media;
  }
}
