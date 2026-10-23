// src/domain/shared/I18nText.ts
import { DomainError } from './DomainError';

/**
 * Texte traduisible tel que stocké en JSONB. Le français est la langue de référence :
 * les autres langues sont optionnelles et retombent sur lui à l'affichage.
 */
export type I18nText = { fr: string; en?: string; de?: string };

/** Saisie brute d'un formulaire : les champs facultatifs peuvent être vides ou absents. */
export type I18nTextInput = { fr?: string | null; en?: string | null; de?: string | null };

/**
 * Normalise une saisie : espaces rognés, traductions vides retirées (une chaîne vide
 * empêcherait le repli sur le français), français exigé.
 */
export function normalizeI18nText(input: I18nTextInput): I18nText {
  const fr = input.fr?.trim();
  if (!fr) {
    throw new DomainError('Le texte en français est obligatoire.', 'TRANSLATION_FR_REQUIRED');
  }

  const text: I18nText = { fr };
  const en = input.en?.trim();
  const de = input.de?.trim();
  if (en) text.en = en;
  if (de) text.de = de;
  return text;
}
