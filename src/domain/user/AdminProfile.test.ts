// src/domain/user/AdminProfile.test.ts
import { describe, expect, it } from 'vitest';
import { AdminProfile } from './AdminProfile';
import { PermissionSet } from './PermissionSet';
import { USER_ROLES, type UserRole } from './UserRole';

function profile(role: UserRole, isActive = true, raw: unknown = {}) {
  return new AdminProfile('id-1', 'ada@byb.be', 'Ada', PermissionSet.from(role, raw), isActive, new Date('2026-01-01'));
}

describe('AdminProfile', () => {
  it('déduit son rôle du jeu de permissions', () => {
    expect(profile(USER_ROLES.SUPERADMIN).role).toBe('superadmin');
    expect(profile(USER_ROLES.SUPERADMIN).isSuperadmin).toBe(true);
    expect(profile(USER_ROLES.ADMIN).isSuperadmin).toBe(false);
  });

  it('délègue le contrôle des droits au jeu de permissions', () => {
    const admin = profile(USER_ROLES.ADMIN, true, { services: { view: true } });

    expect(admin.can('services', 'view')).toBe(true);
    expect(admin.can('services', 'edit')).toBe(false);
  });

  it("retire tous les droits à un compte désactivé, superadmin compris", () => {
    expect(profile(USER_ROLES.SUPERADMIN, false).can('users', 'edit')).toBe(false);
    expect(profile(USER_ROLES.ADMIN, false, { services: { view: true } }).can('services', 'view')).toBe(false);
  });
});
