// src/components/admin/auditMetadata.ts

/** Valeur affichable d'une ligne de détail ; l'interface la traduit (oui/non, accordé/retiré, vide). */
export type MetadataScalar = string | number | boolean | null;

export type MetadataRow =
  | { kind: 'value'; label: string; value: MetadataScalar }
  | { kind: 'change'; label: string; from: MetadataScalar; to: MetadataScalar };

/** Au-delà, un objet imbriqué est affiché en JSON compact plutôt que déroulé indéfiniment. */
const MAX_DEPTH = 3;

/**
 * Met à plat le `metadata` d'une entrée du journal en lignes lisibles.
 *
 * Deux formes sont reconnues comme des changements « avant → après » :
 *  - `{ from, to }` (ex. rôle modifié) ;
 *  - un tableau de `{ domain, action, from, to }` (diff de permissions), une ligne par case.
 * Tout le reste est déroulé en `clé.sous-clé : valeur`. Aucune forme n'est supposée connue :
 * le journal contient des actions que le code actuel ne produit peut-être plus.
 */
export function describeMetadata(metadata: Record<string, unknown>): MetadataRow[] {
  return collect(metadata, '', 0);
}

function collect(source: Record<string, unknown>, prefix: string, depth: number): MetadataRow[] {
  return Object.entries(source).flatMap(([key, value]) => describeEntry(`${prefix}${key}`, value, depth));
}

function describeEntry(label: string, value: unknown, depth: number): MetadataRow[] {
  if (isPermissionChangeList(value)) {
    return value.map((change) => ({
      kind: 'change' as const,
      label: `${change.domain}.${change.action}`,
      from: change.from,
      to: change.to,
    }));
  }

  if (isFromTo(value)) return [{ kind: 'change', label, from: value.from, to: value.to }];

  if (isPlainObject(value)) {
    return depth >= MAX_DEPTH
      ? [{ kind: 'value', label, value: JSON.stringify(value) }]
      : collect(value, `${label}.`, depth + 1);
  }

  if (Array.isArray(value)) {
    return [{ kind: 'value', label, value: value.every(isScalar) ? value.join(', ') : JSON.stringify(value) }];
  }

  return [{ kind: 'value', label, value: toScalar(value) }];
}

function isScalar(value: unknown): value is MetadataScalar {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function toScalar(value: unknown): MetadataScalar {
  if (isScalar(value)) return value;
  return value === undefined ? null : JSON.stringify(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFromTo(value: unknown): value is { from: MetadataScalar; to: MetadataScalar } {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 2 && keys.includes('from') && keys.includes('to') && isScalar(value.from) && isScalar(value.to);
}

type PermissionChangeLike = { domain: string; action: string; from: boolean; to: boolean };

function isPermissionChangeList(value: unknown): value is PermissionChangeLike[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        isPlainObject(item) &&
        typeof item.domain === 'string' &&
        typeof item.action === 'string' &&
        typeof item.from === 'boolean' &&
        typeof item.to === 'boolean',
    )
  );
}
