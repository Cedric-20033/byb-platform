// src/application/users/InviteAdmin.ts
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { AdminInviter } from '@/domain/user/AdminInviter';
import type { AdminRepository } from '@/domain/user/AdminRepository';
import type { UserRole } from '@/domain/user/UserRole';
import type { AdminActor } from './AdminActor';

export type InviteAdminInput = AdminActor & {
  email: string;
  fullName: string;
  role: UserRole;
  locale: string;
};

/**
 * Use case : un superadmin invite un nouvel admin ou superadmin.
 * Le compte naît avec les droits par défaut de son rôle ; le mot de passe
 * est choisi par l'invité via le lien reçu par email.
 */
export class InviteAdmin {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly adminInviter: AdminInviter,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, ...invitation }: InviteAdminInput): Promise<{ id: string }> {
    // Normalisation : l'unicité de l'email ne doit pas dépendre de la casse saisie.
    const email = invitation.email.trim().toLowerCase();

    if (await this.adminRepository.findByEmail(email)) {
      throw new DomainError(`Un compte existe déjà pour ${email}.`, 'ADMIN_ALREADY_EXISTS');
    }

    const { id } = await this.adminInviter.invite({ ...invitation, email, fullName: invitation.fullName.trim() });

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.USER_INVITED,
      targetType: 'user',
      targetId: id,
      metadata: { email, role: invitation.role },
    });

    return { id };
  }
}
