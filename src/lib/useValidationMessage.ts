// src/lib/useValidationMessage.ts
'use client';

import { useTranslations } from 'next-intl';
import { isValidationMessageKey } from '@/lib/validation/messages';

/**
 * Traduit le message d'une erreur de formulaire (react-hook-form + Zod).
 *
 * Les schémas portent des clés (cf. src/lib/validation/messages.ts). Un message
 * inconnu — typiquement une règle Zod sans message personnalisé, qui produirait
 * un texte anglais par défaut — retombe sur le message générique plutôt que
 * d'exposer du texte non traduit.
 */
export function useValidationMessage(): (message: string | undefined) => string {
  const t = useTranslations('errors.validation');

  return (message) => {
    if (!message) return '';
    return isValidationMessageKey(message) ? t(message) : t('invalid');
  };
}
