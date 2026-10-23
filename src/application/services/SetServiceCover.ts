// src/application/services/SetServiceCover.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { ServiceMediaRepository } from '@/domain/service/ServiceMediaRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';

export type SetServiceCoverInput = AdminActor & { mediaId: string };

/** Use case : désigne l'image de couverture d'un service (seule une image peut l'être). */
export class SetServiceCover {
  constructor(
    private readonly mediaRepository: ServiceMediaRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, mediaId }: SetServiceCoverInput): Promise<void> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) throw new DomainError(`Média introuvable : ${mediaId}`, 'MEDIA_NOT_FOUND');
    if (media.type !== 'image') {
      throw new DomainError('Seule une image peut être la couverture.', 'MEDIA_COVER_MUST_BE_IMAGE');
    }
    if (media.isCover) return;

    await this.mediaRepository.setCover(media.serviceId, mediaId);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: media.serviceId,
      metadata: { scope: 'media', operation: 'cover_changed', publicId: media.publicId },
    });
  }
}
