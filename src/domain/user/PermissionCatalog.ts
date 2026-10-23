// src/domain/user/PermissionCatalog.ts

/**
 * Catalogue des permissions : domaines, actions et valeurs par défaut.
 *
 * Le superadmin n'a pas d'entrée dans ce système : son rôle suffit à tout
 * autoriser (voir PermissionSet et les policies RLS `current_role_name() = 'superadmin'`).
 */
export const PERMISSION_DOMAINS = [
  'appointments',
  'slots',
  'holidays',
  'services',
  'projects',
  'testimonials',
  'settings',
  'users',
  'audit_logs',
] as const;

export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number];

/**
 * 'export' est distinct de 'view' : un admin peut consulter les RDV sans
 * nécessairement pouvoir en extraire les données.
 */
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/**
 * Domaines que le superadmin ne peut pas déléguer : la gestion des comptes lui
 * reste réservée (garde `requireSuperadminActor`), aucune case ne l'accorde.
 */
export const NON_DELEGABLE_DOMAINS: readonly PermissionDomain[] = ['users'];

/**
 * Actions qui ont un sens pour chaque domaine. La grille stockée reste complète
 * (simple à lire côté SQL), mais l'interface n'affiche que ces cases et le
 * use case d'édition ignore toute autre valeur.
 */
export const APPLICABLE_ACTIONS: Record<PermissionDomain, readonly PermissionAction[]> = {
  appointments: ['view', 'create', 'edit', 'delete', 'export'],
  slots: ['view', 'create', 'edit', 'delete'],
  holidays: ['view', 'create', 'edit', 'delete'],
  services: ['view', 'create', 'edit', 'delete'],
  projects: ['view', 'create', 'edit', 'delete'],
  testimonials: ['view', 'create', 'edit', 'delete'],
  settings: ['view', 'edit'],
  users: [],
  audit_logs: ['view', 'export'],
};

/** Une case est délégable si son domaine l'est et si l'action s'y applique. */
export function isDelegable(domain: PermissionDomain, action: PermissionAction): boolean {
  return !NON_DELEGABLE_DOMAINS.includes(domain) && APPLICABLE_ACTIONS[domain].includes(action);
}

/** Domaines éditables dans la matrice de la page Permissions. */
export const DELEGABLE_DOMAINS: readonly PermissionDomain[] = PERMISSION_DOMAINS.filter(
  (domain) => !NON_DELEGABLE_DOMAINS.includes(domain),
);

/** Grille complète : chaque domaine porte une valeur pour chaque action. */
export type PermissionGrid = Record<PermissionDomain, Record<PermissionAction, boolean>>;

/** Grille partielle, telle que stockée ou saisie (entrées absentes = refusées). */
export type PartialPermissionGrid = {
  [domain in PermissionDomain]?: { [action in PermissionAction]?: boolean };
};

/**
 * Permissions attribuées à un nouvel admin, reflétant le périmètre du cahier
 * des charges : consultation, recherche et export des RDV, gestion complète des
 * jours fériés, aucun droit sur services, utilisateurs et journal.
 *
 * Doit rester identique à `default_admin_permissions()` (dernière migration qui la
 * redéfinit, actuellement 0008) : `constants.test.ts` compare les deux.
 */
export const DEFAULT_ADMIN_PERMISSIONS: PermissionGrid = {
  appointments: { view: true, create: false, edit: false, delete: false, export: true },
  slots: { view: true, create: false, edit: false, delete: false, export: false },
  holidays: { view: true, create: true, edit: true, delete: true, export: false },
  services: { view: true, create: false, edit: false, delete: false, export: false },
  projects: { view: true, create: false, edit: false, delete: false, export: false },
  testimonials: { view: true, create: false, edit: false, delete: false, export: false },
  settings: { view: false, create: false, edit: false, delete: false, export: false },
  users: { view: false, create: false, edit: false, delete: false, export: false },
  audit_logs: { view: false, create: false, edit: false, delete: false, export: false },
};

/** Lignes de la matrice préremplies par un preset : domaine → actions accordées. */
type PresetSpec = { [domain in PermissionDomain]?: readonly PermissionAction[] };

const CRUD_ALL = ['view', 'create', 'edit', 'delete'] as const;

const PRESET_SPECS = {
  readOnly: {
    appointments: ['view'],
    slots: ['view'],
    holidays: ['view'],
    services: ['view'],
    projects: ['view'],
    testimonials: ['view'],
  },
  manager: {
    appointments: ['view', 'create', 'edit', 'delete', 'export'],
    slots: CRUD_ALL,
    holidays: CRUD_ALL,
    services: CRUD_ALL,
    projects: CRUD_ALL,
    testimonials: CRUD_ALL,
    settings: ['view'],
  },
} satisfies Record<string, PresetSpec>;

export const PERMISSION_PRESET_IDS = ['readOnly', 'standard', 'manager'] as const;
export type PermissionPresetId = (typeof PERMISSION_PRESET_IDS)[number];

/**
 * Grille complète d'un preset. Le journal d'audit et les réglages ne sont
 * jamais accordés en bloc (« manager » n'a que la lecture des réglages) :
 * ce sont des droits sensibles qu'on coche volontairement, un par un.
 */
export function buildPresetGrid(preset: PermissionPresetId): PermissionGrid {
  if (preset === 'standard') return structuredClone(DEFAULT_ADMIN_PERMISSIONS);

  const spec: PresetSpec = PRESET_SPECS[preset];
  const grid = {} as PermissionGrid;
  for (const domain of PERMISSION_DOMAINS) {
    grid[domain] = {} as PermissionGrid[PermissionDomain];
    for (const action of PERMISSION_ACTIONS) {
      grid[domain][action] = spec[domain]?.includes(action) ?? false;
    }
  }
  return grid;
}
