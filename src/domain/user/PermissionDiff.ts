// src/domain/user/PermissionDiff.ts
import {
  PERMISSION_ACTIONS,
  PERMISSION_DOMAINS,
  isDelegable,
  type PermissionAction,
  type PermissionDomain,
  type PermissionGrid,
} from './PermissionCatalog';

export type PermissionChange = {
  domain: PermissionDomain;
  action: PermissionAction;
  from: boolean;
  to: boolean;
};

/**
 * Cases qui diffèrent entre deux grilles, dans l'ordre du catalogue.
 * Sert au journal d'audit (avant/après) et à l'indicateur « modifications
 * non enregistrées » de l'interface : une seule définition de « modifié ».
 */
export function diffPermissions(before: PermissionGrid, after: PermissionGrid): PermissionChange[] {
  const changes: PermissionChange[] = [];
  for (const domain of PERMISSION_DOMAINS) {
    for (const action of PERMISSION_ACTIONS) {
      if (before[domain][action] !== after[domain][action]) {
        changes.push({ domain, action, from: before[domain][action], to: after[domain][action] });
      }
    }
  }
  return changes;
}

/**
 * Ne conserve de `requested` que les cases délégables ; toute autre case
 * (domaine réservé au superadmin, action sans objet) garde sa valeur actuelle.
 * Empêche d'accorder un droit invisible dans la matrice en forgeant une requête.
 */
export function restrictToDelegable(current: PermissionGrid, requested: PermissionGrid): PermissionGrid {
  const result = structuredClone(current);
  for (const domain of PERMISSION_DOMAINS) {
    for (const action of PERMISSION_ACTIONS) {
      if (isDelegable(domain, action)) result[domain][action] = requested[domain][action];
    }
  }
  return result;
}
