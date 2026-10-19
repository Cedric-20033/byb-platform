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
        'admin/calendar.ts#getCalendarDataAction',
        'admin/dashboard.ts#getDashboardStatsAction',
        'admin/dashboard.ts#getPendingNotificationsAction',
        'admin/holidays.ts#createHolidayAction',
        'admin/holidays.ts#deleteHolidayAction',
        'admin/holidays.ts#importBelgianHolidaysAction',
        'admin/holidays.ts#listHolidaysAction',
        'admin/holidays.ts#previewHolidayConflictsAction',
        'admin/services.ts#listServicesAction',
        'admin/slots.ts#listSlotsByDateAction',
        'admin/slots.ts#listSlotsByRangeAction',
        'admin/testimonials.ts#listTestimonialsAction',
      ].sort(),
    );
  });

  describe('historique d\u2019un rendez-vous', () => {
    const HISTORY = 'admin/appointments.ts#listAppointmentHistoryAction';
    const gridWith = (appointmentsView: boolean, auditView: boolean) =>
      profile(USER_ROLES.ADMIN, { appointments: { view: appointmentsView }, audit_logs: { view: auditView } });
    const allowed = (admin: AdminProfile) => isActionAllowed(admin, ACTION_REQUIREMENTS[HISTORY]);

    it('est fermé à un admin aux droits par défaut (le journal d\u2019audit ne lui est pas ouvert)', () => {
      expect(allowed(defaultAdmin)).toBe(false);
    });

    it('exige AUSSI la consultation du journal : consulter les RDV ne suffit pas', () => {
      expect(allowed(gridWith(true, false))).toBe(false);
    });

    it('exige la consultation des RDV : lire le journal ne suffit pas', () => {
      expect(allowed(gridWith(false, true))).toBe(false);
    });

    it('s\u2019ouvre avec les deux droits', () => {
      expect(allowed(gridWith(true, true))).toBe(true);
    });
  });

  describe('création manuelle d\u2019un rendez-vous', () => {
    const CREATE = 'admin/appointments.ts#createAppointmentByAdminAction';
    const gridWith = (view: boolean, create: boolean) => profile(USER_ROLES.ADMIN, { appointments: { view, create } });
    const allowed = (admin: AdminProfile) => isActionAllowed(admin, ACTION_REQUIREMENTS[CREATE]);

    it('est fermée à un admin aux droits par défaut (la création est réservée au superadmin)', () => {
      expect(allowed(defaultAdmin)).toBe(false);
    });

    it('exige AUSSI la consultation : créer sans pouvoir lire ferait échouer la fonction SQL', () => {
      expect(allowed(gridWith(false, true))).toBe(false);
    });

    it('exige la création : consulter ne suffit pas', () => {
      expect(allowed(gridWith(true, false))).toBe(false);
    });

    it('s\u2019ouvre avec consultation et création', () => {
      expect(allowed(gridWith(true, true))).toBe(true);
    });
  });

  describe('modification, replanification et suppression d\u2019un rendez-vous', () => {
    const requirement = (name: string) => ACTION_REQUIREMENTS[`admin/appointments.ts#${name}`];
    const grid = (view: boolean, edit: boolean, del: boolean) =>
      profile(USER_ROLES.ADMIN, { appointments: { view, edit, delete: del } });

    it.each(['rescheduleAppointmentAction', 'updateAppointmentDetailsAction'])(
      '%s exige consultation ET modification',
      (name) => {
        expect(isActionAllowed(defaultAdmin, requirement(name))).toBe(false);
        expect(isActionAllowed(grid(true, false, true), requirement(name))).toBe(false);
        expect(isActionAllowed(grid(false, true, false), requirement(name))).toBe(false);
        expect(isActionAllowed(grid(true, true, false), requirement(name))).toBe(true);
      },
    );

    it('deleteAppointmentAction exige consultation ET suppression, indépendamment de la modification', () => {
      const name = 'deleteAppointmentAction';

      expect(isActionAllowed(defaultAdmin, requirement(name))).toBe(false);
      expect(isActionAllowed(grid(true, true, false), requirement(name))).toBe(false);
      expect(isActionAllowed(grid(false, false, true), requirement(name))).toBe(false);
      expect(isActionAllowed(grid(true, false, true), requirement(name))).toBe(true);
    });
  });

  describe('catalogue des services', () => {
    const gridWith = (...actions: ('view' | 'create' | 'edit' | 'delete')[]) =>
      profile(USER_ROLES.ADMIN, {
        services: Object.fromEntries(actions.map((action) => [action, true])),
      });
    const allowed = (admin: AdminProfile, key: string) => isActionAllowed(admin, ACTION_REQUIREMENTS[key]);

    it('« edit » seul modifie, archive et réordonne, mais ne crée ni ne supprime', () => {
      const editor = gridWith('edit');
      expect(allowed(editor, 'admin/services.ts#updateServiceAction')).toBe(true);
      expect(allowed(editor, 'admin/services.ts#archiveServiceAction')).toBe(true);
      expect(allowed(editor, 'admin/serviceMedia.ts#setServiceCoverAction')).toBe(true);
      expect(allowed(editor, 'admin/services.ts#createServiceAction')).toBe(false);
      expect(allowed(editor, 'admin/services.ts#deleteServiceAction')).toBe(false);
    });

    it('« create » ouvre la création et l\'ajout de médias, pas la suppression', () => {
      const creator = gridWith('create');
      expect(allowed(creator, 'admin/services.ts#createServiceAction')).toBe(true);
      expect(allowed(creator, 'admin/serviceMedia.ts#attachServiceMediaAction')).toBe(true);
      expect(allowed(creator, 'admin/serviceMedia.ts#removeServiceMediaAction')).toBe(false);
    });

    it('« delete » ouvre la suppression de service, de sous-prestation et de média', () => {
      const remover = gridWith('delete');
      expect(allowed(remover, 'admin/services.ts#deleteServiceAction')).toBe(true);
      expect(allowed(remover, 'admin/services.ts#deleteSubServiceAction')).toBe(true);
      expect(allowed(remover, 'admin/serviceMedia.ts#removeServiceMediaAction')).toBe(true);
      expect(allowed(remover, 'admin/services.ts#updateServiceAction')).toBe(false);
    });
  });

  describe.each([
    {
      domain: 'testimonials',
      view: ['admin/testimonials.ts#listTestimonialsAction'],
      create: ['admin/testimonials.ts#createTestimonialAction'],
      edit: [
        'admin/testimonials.ts#updateTestimonialAction',
        'admin/testimonials.ts#publishTestimonialAction',
        'admin/testimonials.ts#unpublishTestimonialAction',
        'admin/testimonials.ts#reorderTestimonialsAction',
      ],
      remove: ['admin/testimonials.ts#deleteTestimonialAction'],
    },
  ])('$domain : une permission par action', ({ domain, view, create, edit, remove }) => {
    const gridWith = (action: 'view' | 'create' | 'edit' | 'delete') =>
      profile(USER_ROLES.ADMIN, { [domain]: { [action]: true } });
    // `allowed` : TOUTES les actions sont ouvertes ; `anyAllowed` : AU MOINS UNE l'est (fuite de droit).
    const allowed = (admin: AdminProfile, keys: string[]) =>
      keys.every((key) => isActionAllowed(admin, ACTION_REQUIREMENTS[key]));
    const anyAllowed = (admin: AdminProfile, keys: string[]) =>
      keys.some((key) => isActionAllowed(admin, ACTION_REQUIREMENTS[key]));

    it('chaque droit n\'ouvre que ses propres actions', () => {
      expect(allowed(gridWith('view'), view)).toBe(true);
      expect(anyAllowed(gridWith('view'), [...create, ...edit, ...remove])).toBe(false);

      expect(allowed(gridWith('create'), create)).toBe(true);
      expect(anyAllowed(gridWith('create'), [...view, ...edit, ...remove])).toBe(false);

      expect(allowed(gridWith('edit'), edit)).toBe(true);
      expect(anyAllowed(gridWith('edit'), [...view, ...create, ...remove])).toBe(false);

      expect(allowed(gridWith('delete'), remove)).toBe(true);
      expect(anyAllowed(gridWith('delete'), [...view, ...create, ...edit])).toBe(false);
    });

    it('l\'admin par défaut peut consulter, mais ni créer, ni modifier, ni supprimer', () => {
      expect(allowed(defaultAdmin, view)).toBe(true);
      expect(anyAllowed(defaultAdmin, [...create, ...edit, ...remove])).toBe(false);
    });
  });

  describe('journal d\'audit', () => {
    const LIST = 'admin/auditLogs.ts#listAuditLogsAction';
    const EXPORT = 'admin/auditLogs.ts#exportAuditLogsAction';
    const gridWith = (view: boolean, exportRight: boolean) =>
      profile(USER_ROLES.ADMIN, { audit_logs: { view, export: exportRight } });
    const allowed = (admin: AdminProfile, key: string) => isActionAllowed(admin, ACTION_REQUIREMENTS[key]);

    it('est fermé à un admin aux droits par défaut', () => {
      expect(allowed(defaultAdmin, LIST)).toBe(false);
      expect(allowed(defaultAdmin, EXPORT)).toBe(false);
    });

    it('« view » seul permet de consulter mais pas d\'exporter', () => {
      expect(allowed(gridWith(true, false), LIST)).toBe(true);
      expect(allowed(gridWith(true, false), EXPORT)).toBe(false);
    });

    it('l\'export exige AUSSI la consultation (export seul ne suffit pas)', () => {
      expect(allowed(gridWith(false, true), LIST)).toBe(false);
      expect(allowed(gridWith(false, true), EXPORT)).toBe(false);
    });

    it('« view » + « export » ouvre les deux actions', () => {
      expect(allowed(gridWith(true, true), LIST)).toBe(true);
      expect(allowed(gridWith(true, true), EXPORT)).toBe(true);
    });
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
