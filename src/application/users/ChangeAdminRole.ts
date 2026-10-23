// src/application/users/ChangeAdminRole.ts
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { AdminRepository } from '@/domain/user/AdminRepository';
import { PermissionSet } from '@/domain/user/PermissionSet';
import type { UserRole } from '@/domain/user/UserRole';
import type { AdminActor } from './AdminActor';
import { ensureNotLastSuperadmin } from './ensureNotLastSuperadmin';

export type ChangeAdminRoleInput = AdminActor & { adminId: string; role: UserRole };

/** Use case : promouvoir un admin ou rétrograder un superadmin. */
export class ChangeAdminRole {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, adminId, role }: ChangeAdminRoleInput): Promise<AdminProfile> {
    // Se rétrograder soi-même ferait perdre l'accès en pleine session.
    if (adminId === actorId) {
      throw new DomainError('Impossible de modifier son propre rôle.', 'CANNOT_MODIFY_SELF');
    }

    const target = await this.adminRepository.findById(adminId);
    if (!target) throw new DomainError(`Compte introuvable : ${adminId}`, 'ADMIN_NOT_FOUND');

    if (target.role === role) return target;

    await ensureNotLastSuperadmin(this.adminRepository, target);

    await this.adminRepository.updateRole(adminId, role);
    // La grille suit le rôle : un ancien superadmin repart des droits par défaut d'un admin.
    const updated = await this.adminRepository.updatePermissions(adminId, PermissionSet.defaults(role));

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.USER_ROLE_UPDATED,
      targetType: 'user',
      targetId: adminId,
      metadata: { from: target.role, to: role },
    });

    return updated;
  }
}
