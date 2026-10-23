// src/domain/user/UserRole.ts

/** Rôles RBAC de l'application. */
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export function isUserRole(value: unknown): value is UserRole {
  return value === USER_ROLES.SUPERADMIN || value === USER_ROLES.ADMIN;
}
