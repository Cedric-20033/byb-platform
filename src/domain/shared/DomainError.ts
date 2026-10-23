// src/domain/shared/DomainError.ts

/**
 * Erreur métier typée, à distinguer d'une erreur technique (réseau, bug...).
 *
 * Le `code` est une clé stable, indépendante de la langue, que la couche
 * présentation peut mapper vers messages/fr.json, en.json ou de.json.
 * Exemple : DomainError('...', 'SLOT_UNAVAILABLE') → t('errors.SLOT_UNAVAILABLE')
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: DomainErrorCode,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export type DomainErrorCode =
  | 'SLOT_NOT_FOUND'
  | 'SLOT_UNAVAILABLE'
  | 'SLOT_ALREADY_BLOCKED'
  | 'SLOT_NOT_BLOCKED'
  | 'SLOT_IN_PAST'
  | 'SLOT_OVERLAP'
  | 'HOLIDAY_CONFLICTS'
  | 'APPOINTMENT_NOT_FOUND'
  | 'APPOINTMENT_IN_PAST'
  | 'SLOT_TOO_SOON'
  | 'SLOT_TOO_FAR'
  | 'BOOKING_LIMIT_REACHED'
  | 'CAPTCHA_FAILED'
  | 'TOO_MANY_ATTEMPTS'
  | 'EMAIL_DELIVERY_FAILED'
  | 'INVALID_STATUS_TRANSITION'
  | 'HOLIDAY_NOT_FOUND'
  | 'ADMIN_NOT_FOUND'
  | 'ADMIN_ALREADY_EXISTS'
  | 'CANNOT_MODIFY_SELF'
  | 'LAST_SUPERADMIN'
  | 'SUPERADMIN_NOT_EDITABLE'
  | 'SERVICE_NOT_FOUND'
  | 'SERVICE_SLUG_TAKEN'
  | 'SERVICE_HAS_APPOINTMENTS'
  | 'SERVICE_ORDER_INVALID'
  | 'SERVICE_COVER_REQUIRED'
  | 'SUB_SERVICE_NOT_FOUND'
  | 'SUB_SERVICE_SLUG_TAKEN'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_TYPE_NOT_ALLOWED'
  | 'MEDIA_TOO_LARGE'
  | 'MEDIA_FOLDER_MISMATCH'
  | 'MEDIA_COVER_MUST_BE_IMAGE'
  | 'TESTIMONIAL_NOT_FOUND'
  | 'TESTIMONIAL_ORDER_INVALID'
  | 'TESTIMONIAL_RATING_INVALID'
  | 'SETTINGS_INVALID'
  | 'SLUG_INVALID'
  | 'TRANSLATION_FR_REQUIRED';
