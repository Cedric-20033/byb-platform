// src/domain/service/ServiceOrder.ts
import { DomainError, type DomainErrorCode } from '@/domain/shared/DomainError';

/**
 * Vérifie que `proposed` est une permutation exacte de `current` : mêmes identifiants,
 * sans doublon ni oubli. Un ordre périmé (élément ajouté ou supprimé entre-temps par
 * un autre admin) est refusé plutôt qu'appliqué à moitié, ce qui garantit un ordre
 * contigu 0..n-1 après écriture.
 */
export function assertSamePermutation(current: readonly string[], proposed: readonly string[], code: DomainErrorCode): void {
  const expected = new Set(current);
  const sameSize = proposed.length === current.length && new Set(proposed).size === proposed.length;

  if (!sameSize || !proposed.every((id) => expected.has(id))) {
    throw new DomainError('Ordre demandé incohérent avec la liste actuelle.', code);
  }
}

/** Prochain rang libre dans une liste ordonnée 0..n-1 (0 pour une liste vide). */
export function nextOrder(items: readonly { order: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.order + 1), 0);
}
