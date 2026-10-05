// src/domain/user/PermissionSet.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_ADMIN_PERMISSIONS, PERMISSION_ACTIONS, PERMISSION_DOMAINS } from './PermissionCatalog';
import { PermissionSet } from './PermissionSet';
import { USER_ROLES } from './UserRole';

describe('PermissionSet', () => {
  describe('can', () => {
    it('autorise tout au superadmin, même avec une grille vide', () => {
      const set = PermissionSet.from(USER_ROLES.SUPERADMIN, {});

      for (const domain of PERMISSION_DOMAINS) {
        for (const action of PERMISSION_ACTIONS) {
          expect(set.can(domain, action)).toBe(true);
        }
      }
    });

    it("n'accorde à un admin que ce que sa grille autorise", () => {
      const set = PermissionSet.from(USER_ROLES.ADMIN, {
        services: { view: true, create: true },
      });

      expect(set.can('services', 'view')).toBe(true);
      expect(set.can('services', 'create')).toBe(true);
      expect(set.can('services', 'edit')).toBe(false);
      expect(set.can('slots', 'view')).toBe(false);
    });

    it.each([null, undefined, 'texte', 42, []])('refuse tout quand la valeur brute est %j', (raw) => {
      const set = PermissionSet.from(USER_ROLES.ADMIN, raw);

      for (const domain of PERMISSION_DOMAINS) {
        for (const action of PERMISSION_ACTIONS) {
          expect(set.can(domain, action)).toBe(false);
        }
      }
    });

    it('ne retient que les valeurs strictement vraies et ignore les clés inconnues', () => {
      const set = PermissionSet.from(USER_ROLES.ADMIN, {
        services: { view: 'true', create: 1, edit: true, inconnue: true },
        domaine_inconnu: { view: true },
      });

      expect(set.can('services', 'view')).toBe(false);
      expect(set.can('services', 'create')).toBe(false);
      expect(set.can('services', 'edit')).toBe(true);
      expect(Object.keys(set.toJSON())).not.toContain('domaine_inconnu');
    });
  });

  describe('defaults', () => {
    it('reproduit DEFAULT_ADMIN_PERMISSIONS', () => {
      expect(PermissionSet.defaults().toJSON()).toEqual(DEFAULT_ADMIN_PERMISSIONS);
    });

    it('prend le rôle admin par défaut', () => {
      expect(PermissionSet.defaults().role).toBe(USER_ROLES.ADMIN);
    });
  });

  describe('with', () => {
    it('retourne un nouveau jeu sans modifier le précédent', () => {
      const original = PermissionSet.from(USER_ROLES.ADMIN, {});
      const updated = original.with('services', 'create', true);

      expect(updated).not.toBe(original);
      expect(updated.can('services', 'create')).toBe(true);
      expect(original.can('services', 'create')).toBe(false);
    });

    it("retourne la même instance quand la valeur ne change pas", () => {
      const original = PermissionSet.from(USER_ROLES.ADMIN, {});

      expect(original.with('services', 'create', false)).toBe(original);
    });

    it('peut retirer un droit existant', () => {
      const set = PermissionSet.defaults().with('holidays', 'delete', false);

      expect(set.can('holidays', 'delete')).toBe(false);
      expect(set.can('holidays', 'create')).toBe(true);
    });
  });

  describe('merge', () => {
    it('superpose les valeurs booléennes fournies et conserve le reste', () => {
      const set = PermissionSet.defaults().merge({
        services: { create: true },
        holidays: { delete: false },
      });

      expect(set.can('services', 'create')).toBe(true);
      expect(set.can('services', 'view')).toBe(true);
      expect(set.can('holidays', 'delete')).toBe(false);
      expect(set.can('holidays', 'edit')).toBe(true);
    });

    it('ignore les valeurs non booléennes au lieu de les convertir en refus', () => {
      const set = PermissionSet.defaults().merge({
        holidays: { edit: 'non' as unknown as boolean },
      });

      expect(set.can('holidays', 'edit')).toBe(true);
    });

    it("ne modifie pas l'instance d'origine", () => {
      const original = PermissionSet.defaults();
      original.merge({ services: { create: true } });

      expect(original.can('services', 'create')).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('expose chaque domaine et chaque action', () => {
      const json = PermissionSet.from(USER_ROLES.ADMIN, {}).toJSON();

      expect(Object.keys(json).sort()).toEqual([...PERMISSION_DOMAINS].sort());
      for (const domain of PERMISSION_DOMAINS) {
        expect(Object.keys(json[domain]).sort()).toEqual([...PERMISSION_ACTIONS].sort());
      }
    });

    it("renvoie une copie : la modifier n'altère pas le jeu", () => {
      const set = PermissionSet.defaults();
      const json = set.toJSON();
      json.users.view = true;

      expect(set.can('users', 'view')).toBe(false);
    });

    it('conserve la grille stockée du superadmin (sans la remplacer par « tout vrai »)', () => {
      const json = PermissionSet.from(USER_ROLES.SUPERADMIN, {}).toJSON();

      expect(json.services.view).toBe(false);
    });
  });
});
