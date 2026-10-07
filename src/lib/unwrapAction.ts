// src/lib/unwrapAction.ts
import { ActionError, type ActionFailure } from '@/lib/errors';

/**
 * Déballe le résultat d'une Server Action pour TanStack Query : un échec devient une
 * `ActionError` (traduite par `useErrorMessage`), un succès est renvoyé tel quel.
 */
export function unwrapAction<T extends { success: true }>(result: T | ActionFailure): T {
  if (!result.success) throw new ActionError(result.error);
  return result;
}
