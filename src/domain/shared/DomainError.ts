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
  | 'APPOINTMENT_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'HOLIDAY_NOT_FOUND';
