// src/domain/user/AdminProfile.ts
import type { PermissionAction, PermissionDomain } from './PermissionCatalog';
import type { PermissionSet } from './PermissionSet';
import { USER_ROLES, type UserRole } from './UserRole';

/**
 * Entité : un compte du back-office (admin ou superadmin).
 *
 * Le rôle est porté par le `PermissionSet` (source unique) : impossible
 * d'avoir un profil dont le rôle et les droits se contredisent.
 */
export class AdminProfile {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly fullName: string,
    readonly permissions: PermissionSet,
    readonly isActive: boolean,
    readonly createdAt: Date,
  ) {}

  get role(): UserRole {
    return this.permissions.role;
  }

  get isSuperadmin(): boolean {
    return this.role === USER_ROLES.SUPERADMIN;
  }

  /** Un compte désactivé n'a plus aucun droit, quel que soit son rôle. */
  can(domain: PermissionDomain, action: PermissionAction): boolean {
    return this.isActive && this.permissions.can(domain, action);
  }
}
