// src/application/services/RemoveServiceMedia.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { MediaUploader } from '@/domain/service/MediaUploader';
import type { ServiceMediaRepository } from '@/domain/service/ServiceMediaRepository';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { requireService } from './requireService';

export type RemoveServiceMediaInput = AdminActor & { mediaId: string };

/**
 * Use case : retire un média d'un service et le supprime du stockage.
 * Si c'était la couverture, la première image restante la remplace ; un service ACTIF ne peut
 * pas perdre sa dernière image (voir SetServiceActive).
 */
export class RemoveServiceMedia {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly mediaRepository: ServiceMediaRepository,
    private readonly mediaUploader: MediaUploader,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, mediaId }: RemoveServiceMediaInput): Promise<void> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) throw new DomainError(`Média introuvable : ${mediaId}`, 'MEDIA_NOT_FOUND');

    const service = await requireService(this.serviceRepository, media.serviceId);
    const remaining = service.media.filter((m) => m.id !== mediaId).sort((a, b) => a.order - b.order);
    const remainingImages = remaining.filter((m) => m.type === 'image');

    if (service.isActive && media.type === 'image' && remainingImages.length === 0) {
      throw new DomainError('Un service actif exige une image de couverture.', 'SERVICE_COVER_REQUIRED');
    }

    await this.mediaRepository.remove(mediaId);
    // Ordre contigu 0..n-1 pour les médias restants.
    await this.mediaRepository.reorder(media.serviceId, remaining.map((m) => m.id));
    if (media.isCover && remainingImages.length > 0) {
      await this.mediaRepository.setCover(media.serviceId, remainingImages[0].id);
    }

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: media.serviceId,
      metadata: { scope: 'media', operation: 'removed', type: media.type, publicId: media.publicId },
    });

    // Après l'écriture en base (cf. DeleteService) : un asset orphelin est sans conséquence.
    await this.mediaUploader.deleteAsset(media.publicId, media.type).catch(() => undefined);
  }
}
