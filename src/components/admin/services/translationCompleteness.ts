// src/components/admin/services/translationCompleteness.ts

export const TRANSLATION_LOCALES = ['fr', 'en', 'de'] as const;
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

/** Les valeurs du formulaire contiennent aussi des champs non traduisibles. */
type FormValues = Record<string, unknown>;

function translatedText(value: unknown, locale: TranslationLocale): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const text = (value as Partial<Record<TranslationLocale, unknown>>)[locale];
  return typeof text === 'string' ? text : undefined;
}

/** Une langue est complète quand TOUS les champs traduisibles y sont renseignés. */
export function isLocaleComplete(values: FormValues, fields: readonly string[], locale: TranslationLocale): boolean {
  return fields.every((field) => Boolean(translatedText(values[field], locale)?.trim()));
}

/** Nombre de langues complètes (le français compris), pour l'indicateur du formulaire. */
export function countCompleteLocales(values: FormValues, fields: readonly string[]): number {
  return TRANSLATION_LOCALES.filter((locale) => isLocaleComplete(values, fields, locale)).length;
}
