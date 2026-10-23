// src/domain/user/PermissionSet.ts
import {
  DEFAULT_ADMIN_PERMISSIONS,
  PERMISSION_ACTIONS,
  PERMISSION_DOMAINS,
  type PartialPermissionGrid,
  type PermissionAction,
  type PermissionDomain,
  type PermissionGrid,
} from './PermissionCatalog';
import { USER_ROLES, type UserRole } from './UserRole';

/**
 * Value object immuable : les droits d'un compte.
 *
 * Règle centrale du RBAC, partagée par la garde serveur et l'interface :
 * le superadmin peut tout ; un admin n'a que ce que sa grille accorde, et
 * toute entrée absente ou non booléenne équivaut à un refus (échec fermé).
 */
export class PermissionSet {
  private constructor(
    readonly role: UserRole,
    private readonly grid: PermissionGrid,
  ) {}

  /**
   * Construit un jeu de permissions depuis une valeur non fiable (JSONB en
   * base, formulaire). Seules les valeurs strictement `true` sont retenues.
   */
  static from(role: UserRole, raw: unknown): PermissionSet {
    return new PermissionSet(role, freeze(applyGrid(emptyGrid(), raw)));
  }

  /** Permissions d'un nouveau compte : celles par défaut d'un admin. */
  static defaults(role: UserRole = USER_ROLES.ADMIN): PermissionSet {
    return PermissionSet.from(role, DEFAULT_ADMIN_PERMISSIONS);
  }

  can(domain: PermissionDomain, action: PermissionAction): boolean {
    if (this.role === USER_ROLES.SUPERADMIN) return true;
    return this.grid[domain][action];
  }

  /** Retourne un nouveau jeu avec une case modifiée ; l'instance courante n'est jamais mutée. */
  with(domain: PermissionDomain, action: PermissionAction, allowed: boolean): PermissionSet {
    if (this.grid[domain][action] === allowed) return this;
    const next = emptyGrid();
    applyGrid(next, this.grid);
    next[domain][action] = allowed;
    return new PermissionSet(this.role, freeze(next));
  }

  /** Superpose une grille partielle : seules les valeurs booléennes fournies écrasent l'existant. */
  merge(partial: PartialPermissionGrid): PermissionSet {
    const next = emptyGrid();
    applyGrid(next, this.grid);
    applyGrid(next, partial, { onlyBooleans: true });
    return new PermissionSet(this.role, freeze(next));
  }

  /** Copie de la grille stockée (celle de la base), indépendante de l'instance. */
  toJSON(): PermissionGrid {
    const copy = emptyGrid();
    applyGrid(copy, this.grid);
    return copy;
  }
}

function emptyGrid(): PermissionGrid {
  const grid = {} as PermissionGrid;
  for (const domain of PERMISSION_DOMAINS) {
    grid[domain] = {} as PermissionGrid[PermissionDomain];
    for (const action of PERMISSION_ACTIONS) {
      grid[domain][action] = false;
    }
  }
  return grid;
}

type ApplyOptions = {
  /** `merge` : une valeur non booléenne laisse la valeur existante intacte. */
  onlyBooleans?: boolean;
};

/**
 * Copie dans `target` les valeurs de `source`, en ignorant tout domaine ou
 * action inconnu. Sans option, une valeur autre que `true` donne `false`.
 */
function applyGrid(target: PermissionGrid, source: unknown, options: ApplyOptions = {}): PermissionGrid {
  if (typeof source !== 'object' || source === null) return target;
  const record = source as Record<string, unknown>;

  for (const domain of PERMISSION_DOMAINS) {
    const actions = record[domain];
    if (typeof actions !== 'object' || actions === null) continue;
    const actionRecord = actions as Record<string, unknown>;

    for (const action of PERMISSION_ACTIONS) {
      const value = actionRecord[action];
      if (options.onlyBooleans) {
        if (typeof value === 'boolean') target[domain][action] = value;
      } else {
        target[domain][action] = value === true;
      }
    }
  }
  return target;
}

function freeze(grid: PermissionGrid): PermissionGrid {
  for (const domain of PERMISSION_DOMAINS) Object.freeze(grid[domain]);
  return Object.freeze(grid);
}
