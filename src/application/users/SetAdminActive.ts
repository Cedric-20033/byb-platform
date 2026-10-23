// src/application/users/SetAdminActive.ts
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { AdminRepository } from '@/domain/user/AdminRepository';
import type { AdminActor } from './AdminActor';
import { ensureNotLastSuperadmin } from './ensureNotLastSuperadmin';

export type SetAdminActiveInput = AdminActor & { adminId: string };

/**
 * Base commune de DeactivateAdmin / ReactivateAdmin : le compte et son
 * historique sont conservés (audit), seuls les droits sont suspendus.
 */
abstract class SetAdminActive {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly auditLogger: AuditLogger,
    private readonly isActive: boolean,
  ) {}

  async execute({ actorId, actorRole, adminId }: SetAdminActiveInput): Promise<AdminProfile> {
    if (adminId === actorId) {
      throw new DomainError('Impossible de modifier son propre compte.', 'CANNOT_MODIFY_SELF');
    }

    const target = await this.adminRepository.findById(adminId);
    if (!target) throw new DomainError(`Compte introuvable : ${adminId}`, 'ADMIN_NOT_FOUND');

    if (target.isActive === this.isActive) return target;
    if (!this.isActive) await ensureNotLastSuperadmin(this.adminRepository, target);

    const updated = await this.adminRepository.setActive(adminId, this.isActive);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: this.isActive ? AuditAction.USER_REACTIVATED : AuditAction.USER_DEACTIVATED,
      targetType: 'user',
      targetId: adminId,
      metadata: { email: target.email },
    });

    return updated;
  }
}

export class DeactivateAdmin extends SetAdminActive {
  constructor(adminRepository: AdminRepository, auditLogger: AuditLogger) {
    super(adminRepository, auditLogger, false);
  }
}

export class ReactivateAdmin extends SetAdminActive {
  constructor(adminRepository: AdminRepository, auditLogger: AuditLogger) {
    super(adminRepository, auditLogger, true);
  }
}
