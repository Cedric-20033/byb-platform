// src/components/admin/dashboard/unwrapAction.ts
import { ActionError, type ActionFailure } from '@/lib/errors';

/**
 * Transforme le résultat d'une Server Action en valeur, ou en `ActionError` portant le code d'échec.
 * Les widgets passent par TanStack Query, dont le contrat est « lever une exception » : `useErrorMessage`
 * retrouve ensuite le message traduit à partir du code, sans jamais exposer de détail technique.
 */
export function unwrapAction<T extends { success: true }>(result: T | ActionFailure): T {
  if (!result.success) throw new ActionError((result as ActionFailure).error);
  return result as T;
}
