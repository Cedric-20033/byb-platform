// src/components/admin/adminNavConfig.test.ts
import { describe, expect, it } from 'vitest';
import { PermissionSet } from '@/domain/user/PermissionSet';
import { USER_ROLES, type UserRole } from '@/domain/user/UserRole';
import { ADMIN_NAV_ITEMS, filterNavItems } from './adminNavConfig';

function visibleKeys(role: UserRole, raw: unknown) {
  const set = PermissionSet.from(role, raw);
  return filterNavItems(ADMIN_NAV_ITEMS, { role, can: (d, a) => set.can(d, a) }).map((item) => item.labelKey);
}

describe('filterNavItems', () => {
  it('masque Utilisateurs et Permissions à un admin, même avec des droits sur users', () => {
    const keys = visibleKeys(USER_ROLES.ADMIN, { users: { view: true, edit: true } });

    expect(keys).not.toContain('users');
    expect(keys).not.toContain('permissions');
  });

  it('montre à un admin par défaut le tableau de bord, les RDV, créneaux et jours fériés', () => {
    const keys = visibleKeys(USER_ROLES.ADMIN, PermissionSet.defaults().toJSON());

    expect(keys).toEqual(expect.arrayContaining(['dashboard', 'appointments', 'slots', 'holidays', 'services']));
    expect(keys).not.toContain('auditLogs');
  });

  it("masque l'entrée dont l'admin n'a pas la permission de lecture", () => {
    const keys = visibleKeys(USER_ROLES.ADMIN, { holidays: { view: true } });

    expect(keys).toContain('holidays');
    expect(keys).not.toContain('appointments');
    expect(keys).not.toContain('slots');
  });

  it('montre toutes les entrées au superadmin', () => {
    expect(visibleKeys(USER_ROLES.SUPERADMIN, {})).toHaveLength(ADMIN_NAV_ITEMS.length);
  });
});
