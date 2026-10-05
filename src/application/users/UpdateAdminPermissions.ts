// src/application/users/UpdateAdminPermissions.ts
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { AdminRepository } from '@/domain/user/AdminRepository';
import type { PermissionGrid } from '@/domain/user/PermissionCatalog';
import { diffPermissions, restrictToDelegable, type PermissionChange } from '@/domain/user/PermissionDiff';
import { PermissionSet } from '@/domain/user/PermissionSet';
import type { AdminActor } from './AdminActor';

export type UpdateAdminPermissionsInput = AdminActor & {
  adminId: string;
  /** Grille complète souhaitée, telle qu'affichée dans la matrice. */
  permissions: PermissionGrid;
};

export type UpdateAdminPermissionsResult = {
  admin: AdminProfile;
  changes: PermissionChange[];
};

/**
 * Use case : le superadmin règle les droits d'un admin.
 * Le journal d'audit reçoit le diff exact (case par case), pas la grille entière :
 * on lit ainsi d'un coup d'œil ce qui a été accordé ou retiré.
 */
export class UpdateAdminPermissions {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, adminId, permissions }: UpdateAdminPermissionsInput): Promise<UpdateAdminPermissionsResult> {
    const target = await this.adminRepository.findById(adminId);
    if (!target) throw new DomainError(`Compte introuvable : ${adminId}`, 'ADMIN_NOT_FOUND');

    // Le superadmin a tous les droits par son rôle : une grille éditable serait trompeuse.
    if (target.isSuperadmin) {
      throw new DomainError('Les droits d\'un superadmin ne sont pas modifiables.', 'SUPERADMIN_NOT_EDITABLE');
    }

    const before = target.permissions.toJSON();
    const after = restrictToDelegable(before, PermissionSet.from(target.role, permissions).toJSON());
    const changes = diffPermissions(before, after);

    // Rien n'a changé : pas d'écriture, pas de ligne de journal parasite.
    if (changes.length === 0) return { admin: target, changes };

    const updated = await this.adminRepository.updatePermissions(adminId, PermissionSet.from(target.role, after));

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.USER_PERMISSIONS_UPDATED,
      targetType: 'user',
      targetId: adminId,
      metadata: { email: target.email, changes },
    });

    return { admin: updated, changes };
  }
}
