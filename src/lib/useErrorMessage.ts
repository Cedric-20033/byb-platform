// src/lib/useErrorMessage.ts
'use client';

import { useTranslations } from 'next-intl';
import { ActionError, type ActionErrorCode } from '@/lib/errors';

/**
 * Traduit une erreur d'action en message lisible dans la langue active.
 *
 * Accepte un code (`result.error`) ou une `ActionError` interceptée par
 * TanStack Query. Toute autre valeur retombe sur le message générique :
 * aucun détail technique n'atteint jamais l'utilisateur.
 */
export function useErrorMessage(): (error: ActionErrorCode | Error | unknown) => string {
  const t = useTranslations('errors.codes');

  return (error) => {
    if (typeof error === 'string') return t(error as ActionErrorCode);
    if (error instanceof ActionError) return t(error.code);
    return t('UNKNOWN');
  };
}
