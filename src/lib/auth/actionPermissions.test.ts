// src/lib/auth/actionPermissions.test.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AdminProfile } from '@/domain/user/AdminProfile';
import { PermissionSet } from '@/domain/user/PermissionSet';
import { USER_ROLES, type UserRole } from '@/domain/user/UserRole';
import { ACTION_REQUIREMENTS, isActionAllowed } from './actionPermissions';

const ACTIONS_DIR = join(process.cwd(), 'src', 'app', 'actions');

/** Fichiers de Server Actions : les types et helpers non exportés comme fonctions async n'en font pas partie. */
function listActionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listActionFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

type DiscoveredAction = { key: string; body: string };

/** Corps de chaque `export async function` : du mot-clé jusqu'à la déclaration exportée suivante. */
function discoverActions(): DiscoveredAction[] {
  return listActionFiles(ACTIONS_DIR).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const relPath = relative(ACTIONS_DIR, file).split(sep).join('/');
    const starts = [...source.matchAll(/export async function (\w+)/g)];

    return starts.map((match, index) => ({
      key: `${relPath}#${match[1]}`,
      body: source.slice(match.index, starts[index + 1]?.index ?? source.length),
    }));
  });
}

const discovered = discoverActions();

function profile(role: UserRole, grid: unknown, isActive = true) {
  return new AdminProfile('id', 'a@example.com', 'A', PermissionSet.from(role, grid), isActive, new Date());
}

describe('matrice action → permission', () => {
  it('couvre exactement les Server Actions existantes (aucune oubliée, aucune fantôme)', () => {
    const declared = Object.keys(ACTION_REQUIREMENTS).sort();
    const actual = discovered.map((action) => action.key).sort();

    expect(actual.filter((key) => !declared.includes(key)), 'actions absentes de la matrice').toEqual([]);
    expect(declared.filter((key) => !actual.includes(key)), 'entrées de la matrice sans action').toEqual([]);
  });

  it.each(discovered.map((action) => [action.key, action] as const))('%s applique la garde déclarée', (key, action) => {
    const requirement = ACTION_REQUIREMENTS[key];

    switch (requirement.kind) {
      case 'permission':
        for (const { domain, action: perm } of requirement.required) {
          const guard = new RegExp(
            `assertPermission\\(\\s*(?:admin|await getCurrentAdmin\\(\\)),\\s*'${domain}',\\s*'${perm}'\\s*\\)`,
          );
          expect(action.body, `${key} doit appeler assertPermission(…, '${domain}', '${perm}')`).toMatch(guard);
        }
        break;
      case 'superadmin':
        // `deactivate`/`reactivate` délèguent à l'assistant `setActive`, qui porte la garde.
        expect(action.body).toMatch(/requireSuperadminActor\(|setActive\(/);
        break;
      case 'session':
        expect(action.body).toMatch(/getCurrentAdmin\(/);
        break;
      case 'public':
        expect(action.body, `${key} est déclarée publique : elle ne doit pas manipuler de permission`).not.toMatch(
          /assertPermission\(/,
        );
        break;
    }
  });
});

describe('table de vérité', () => {
  const entries = Object.entries(ACTION_REQUIREMENTS);
  const guarded = entries.filter(([, requirement]) => requirement.kind !== 'public');

  const superadmin = profile(USER_ROLES.SUPERADMIN, {});
  const defaultAdmin = profile(USER_ROLES.ADMIN, PermissionSet.defaults().toJSON());
  const bareAdmin = profile(USER_ROLES.ADMIN, {});
  const disabledSuperadmin = profile(USER_ROLES.SUPERADMIN, {}, false);

  it('le superadmin actif peut appeler toute action', () => {
    for (const [key, requirement] of entries) expect(isActionAllowed(superadmin, requirement), key).toBe(true);
  });

  it('un compte désactivé ne peut appeler aucune action protégée, même superadmin', () => {
    for (const [key, requirement] of guarded) expect(isActionAllowed(disabledSuperadmin, requirement), key).toBe(false);
  });

  it('un admin sans aucun droit ne peut appeler que les actions de session et publiques', () => {
    const allowed = entries.filter(([, requirement]) => isActionAllowed(bareAdmin, requirement)).map(([key]) => key);
    const open = entries.filter(([, r]) => r.kind === 'public' || r.kind === 'session').map(([key]) => key);

    expect(allowed.sort()).toEqual(open.sort());
  });

  it('un admin aux droits par défaut : consultation, export et jours fériés, rien d\'autre', () => {
    const allowedAdminActions = guarded
      .filter(([, requirement]) => requirement.kind === 'permission' && isActionAllowed(defaultAdmin, requirement))
      .map(([key]) => key)
      .sort();

    expect(allowedAdminActions).toEqual(
      [
        'admin/appointments.ts#exportAppointmentsAction',
        'admin/appointments.ts#listAppointmentsAction',
        'admin/dashboard.ts#getDashboardStatsAction',
        'admin/dashboard.ts#getPendingNotificationsAction',
        'admin/holidays.ts#createHolidayAction',
        'admin/holidays.ts#deleteHolidayAction',
        'admin/holidays.ts#listHolidaysAction',
        'admin/slots.ts#listSlotsByDateAction',
      ].sort(),
    );
  });

  it('un admin, même avec tous les droits délégables, n\'accède jamais aux actions superadmin', () => {
    const powerAdmin = profile(USER_ROLES.ADMIN, {
      users: { view: true, create: true, edit: true, delete: true, export: true },
    });

    for (const [key, requirement] of entries.filter(([, r]) => r.kind === 'superadmin')) {
      expect(isActionAllowed(powerAdmin, requirement), key).toBe(false);
    }
  });
});
