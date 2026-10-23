// src/lib/validation/messages.ts

/**
 * Clés des messages de validation Zod.
 *
 * Les schémas (src/lib/validation/*) sont partagés entre le client (formulaires)
 * et le serveur : ils ne peuvent donc pas contenir de phrase dans une langue
 * donnée. Chaque règle porte une CLÉ stable ; l'UI la traduit avec
 * `useValidationMessage()` (namespace `errors.validation` des messages i18n).
 */
export const VALIDATION_MESSAGE_KEYS = [
  'invalid',
  'phoneInvalid',
  'slotInvalid',
  'serviceInvalid',
  'subServiceInvalid',
  'appointmentInvalid',
  'linkInvalid',
  'nameTooShort',
  'nameTooLong',
  'emailInvalid',
  'notesTooLong',
  'subjectTooShort',
  'subjectTooLong',
  'subjectInvalid',
  'messageTooShort',
  'messageTooLong',
  'startDateInvalid',
  'endDateInvalid',
  'startDateAfterEnd',
  'startTimeInvalid',
  'endTimeInvalid',
  'startTimeAfterEnd',
  'durationInvalid',
  'dateInvalid',
  'labelTooShort',
  'labelTooLong',
  'passwordTooShort',
  'passwordTooLong',
  'passwordWeak',
  'passwordMismatch',
  'frRequired',
  'textTooLong',
  'iconInvalid',
  'slugInvalid',
  'mediaInvalid',
  'testimonialInvalid',
  'ratingInvalid',
  'authorNameRequired',
  'fieldRequired',
  'rangeInvalid',
  'sitesInvalid',
] as const;

export type ValidationMessageKey = (typeof VALIDATION_MESSAGE_KEYS)[number];

export function isValidationMessageKey(value: string): value is ValidationMessageKey {
  return (VALIDATION_MESSAGE_KEYS as readonly string[]).includes(value);
}
