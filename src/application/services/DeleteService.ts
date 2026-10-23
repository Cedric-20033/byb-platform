// src/application/services/DeleteService.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { MediaUploader } from '@/domain/service/MediaUploader';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import type { ServiceUsageReader } from '@/domain/service/ServiceUsageReader';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { requireService } from './requireService';

export type DeleteServiceInput = AdminActor & { serviceId: string };

/**
 * Use case : suppression DÉFINITIVE d'un service. Réservée aux services que personne n'a jamais
 * réservés : sinon l'historique des rendez-vous perdrait son service, et il faut archiver.
 */
export class DeleteService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly usageReader: ServiceUsageReader,
    private readonly mediaUploader: MediaUploader,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, serviceId }: DeleteServiceInput): Promise<void> {
    const service = await requireService(this.serviceRepository, serviceId);

    if (await this.usageReader.hasAppointments(serviceId)) {
      throw new DomainError('Ce service est référencé par des rendez-vous.', 'SERVICE_HAS_APPOINTMENTS');
    }

    await this.serviceRepository.delete(serviceId);

    // Garde un ordre contigu 0..n-1 pour les services restants.
    const remaining = (await this.serviceRepository.findAll()).map((s) => s.id);
    await this.serviceRepository.reorder(remaining);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_DELETED,
      targetType: 'service',
      targetId: serviceId,
      metadata: { slug: service.slug, name: service.name.fr, mediaCount: service.media.length },
    });

    // Après la suppression en base : un asset orphelin est sans conséquence, une référence
    // cassée vers un asset supprimé ne l'est pas. L'échec d'une suppression ne remet donc rien en cause.
    await Promise.allSettled(service.media.map((media) => this.mediaUploader.deleteAsset(media.publicId, media.type)));
  }
}
