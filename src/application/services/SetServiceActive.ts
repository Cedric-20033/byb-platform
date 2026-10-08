// src/application/services/SetServiceActive.ts
import type { AdminActor } from '@/application/users/AdminActor';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { requireService } from './requireService';

export type SetServiceActiveInput = AdminActor & { serviceId: string };

/**
 * Base commune d'ArchiveService / RestoreService. Archiver est la voie normale pour retirer
 * un service du site : les rendez-vous passés, eux, continuent de le référencer.
 */
abstract class SetServiceActive {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly auditLogger: AuditLogger,
    private readonly isActive: boolean,
  ) {}

  async execute({ actorId, actorRole, serviceId }: SetServiceActiveInput): Promise<void> {
    const service = await requireService(this.serviceRepository, serviceId);
    if (service.isActive === this.isActive) return;

    // Activer sans image publierait une carte à l'image cassée sur le site public.
    if (this.isActive && !service.media.some((media) => media.type === 'image')) {
      throw new DomainError('Un service actif exige une image de couverture.', 'SERVICE_COVER_REQUIRED');
    }

    await this.serviceRepository.setActive(serviceId, this.isActive);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.SERVICE_UPDATED,
      targetType: 'service',
      targetId: serviceId,
      metadata: { isActive: this.isActive },
    });
  }
}

export class ArchiveService extends SetServiceActive {
  constructor(serviceRepository: ServiceRepository, auditLogger: AuditLogger) {
    super(serviceRepository, auditLogger, false);
  }
}

export class RestoreService extends SetServiceActive {
  constructor(serviceRepository: ServiceRepository, auditLogger: AuditLogger) {
    super(serviceRepository, auditLogger, true);
  }
}
