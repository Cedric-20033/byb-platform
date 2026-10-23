// src/application/users/ResendInvitation.ts
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { AdminInviter } from '@/domain/user/AdminInviter';
import type { AdminRepository } from '@/domain/user/AdminRepository';
import type { AdminActor } from './AdminActor';

export type ResendInvitationInput = AdminActor & { adminId: string; locale: string };

/** Use case : renvoyer le lien d'activation à un compte invité. */
export class ResendInvitation {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly adminInviter: AdminInviter,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, adminId, locale }: ResendInvitationInput): Promise<void> {
    const target = await this.adminRepository.findById(adminId);
    if (!target) throw new DomainError(`Compte introuvable : ${adminId}`, 'ADMIN_NOT_FOUND');

    await this.adminInviter.resend({ email: target.email, fullName: target.fullName, locale });

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.USER_INVITATION_RESENT,
      targetType: 'user',
      targetId: target.id,
      metadata: { email: target.email },
    });
  }
}
