// src/lib/errors.ts
import { DomainError, type DomainErrorCode } from '@/domain/shared/DomainError';

/**
 * Erreur d'accès : l'utilisateur est identifié mais n'a pas le droit d'agir.
 * Classe dédiée pour la distinguer d'une panne technique — sans quoi toute
 * erreur inattendue d'une action admin serait présentée comme un refus de permission.
 */
export class ForbiddenError extends Error {
  constructor(message = 'Action non autorisée.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Erreur d'accès : aucune session valide ou profil administrateur introuvable. */
export class UnauthenticatedError extends Error {
  constructor(message = 'Non authentifié.') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Codes d'erreur stables renvoyés par les Server Actions.
 *
 * Une action ne renvoie JAMAIS de phrase : elle renvoie un code que l'UI
 * traduit via `errors.codes.<CODE>` (messages/{fr,en,de}.json). Ajouter un
 * code ici impose donc de l'ajouter dans les trois fichiers de messages.
 */
export type ActionErrorCode =
  | DomainErrorCode
  | 'VALIDATION_FAILED'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_CURRENT_PASSWORD'
  | 'ACCOUNT_DISABLED'
  | 'TOO_MANY_ATTEMPTS'
  | 'UNKNOWN';

/**
 * Liste exécutable des codes. Le type `Record` force le compilateur à exiger chaque
 * code : en ajouter un dans `ActionErrorCode` sans l'inscrire ici ne compile plus,
 * et le test d'i18n s'appuie sur cette liste pour vérifier les traductions.
 */
const ACTION_ERROR_CODE_MAP: Record<ActionErrorCode, true> = {
  SLOT_NOT_FOUND: true,
  SLOT_UNAVAILABLE: true,
  SLOT_ALREADY_BLOCKED: true,
  SLOT_NOT_BLOCKED: true,
  SLOT_IN_PAST: true,
  SLOT_OVERLAP: true,
  HOLIDAY_CONFLICTS: true,
  APPOINTMENT_NOT_FOUND: true,
  APPOINTMENT_IN_PAST: true,
  SLOT_TOO_SOON: true,
  SLOT_TOO_FAR: true,
  BOOKING_LIMIT_REACHED: true,
  CAPTCHA_FAILED: true,
  EMAIL_DELIVERY_FAILED: true,
  INVALID_STATUS_TRANSITION: true,
  HOLIDAY_NOT_FOUND: true,
  ADMIN_NOT_FOUND: true,
  ADMIN_ALREADY_EXISTS: true,
  CANNOT_MODIFY_SELF: true,
  LAST_SUPERADMIN: true,
  SUPERADMIN_NOT_EDITABLE: true,
  SERVICE_NOT_FOUND: true,
  SERVICE_SLUG_TAKEN: true,
  SERVICE_HAS_APPOINTMENTS: true,
  SERVICE_ORDER_INVALID: true,
  SERVICE_COVER_REQUIRED: true,
  SUB_SERVICE_NOT_FOUND: true,
  SUB_SERVICE_SLUG_TAKEN: true,
  MEDIA_NOT_FOUND: true,
  MEDIA_TYPE_NOT_ALLOWED: true,
  MEDIA_TOO_LARGE: true,
  MEDIA_FOLDER_MISMATCH: true,
  MEDIA_COVER_MUST_BE_IMAGE: true,
  SLUG_INVALID: true,
  TRANSLATION_FR_REQUIRED: true,
  VALIDATION_FAILED: true,
  FORBIDDEN: true,
  UNAUTHENTICATED: true,
  INVALID_CREDENTIALS: true,
  INVALID_CURRENT_PASSWORD: true,
  ACCOUNT_DISABLED: true,
  TOO_MANY_ATTEMPTS: true,
  UNKNOWN: true,
};

export const ACTION_ERROR_CODES = Object.keys(ACTION_ERROR_CODE_MAP) as ActionErrorCode[];

/** Résultat d'échec commun à toutes les Server Actions. */
export type ActionFailure = { success: false; error: ActionErrorCode };

export function failure(code: ActionErrorCode): ActionFailure {
  return { success: false, error: code };
}

/**
 * Erreur côté client qui transporte un code d'action à travers un mécanisme
 * basé sur les exceptions (ex. `mutationFn` de TanStack Query) ; l'UI la
 * traduit ensuite avec `useErrorMessage`.
 */
export class ActionError extends Error {
  constructor(public readonly code: ActionErrorCode) {
    super(code);
    this.name = 'ActionError';
  }
}

/**
 * Convertit une erreur interceptée dans une Server Action en un code stable —
 * point de passage unique pour toutes les actions de l'application.
 *
 * - DomainError : son `code` métier est transmis tel quel.
 * - ForbiddenError / UnauthenticatedError : codes dédiés.
 * - Toute autre erreur (bug, panne réseau, erreur Postgres…) : jamais exposée.
 *   Le détail n'est journalisé qu'en développement, pour ne pas polluer les
 *   logs de production avec du bruit attendu.
 */
export function toErrorCode(error: unknown): ActionErrorCode {
  if (error instanceof DomainError) return error.code;
  if (error instanceof ForbiddenError) return 'FORBIDDEN';
  if (error instanceof UnauthenticatedError) return 'UNAUTHENTICATED';

  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }
  return 'UNKNOWN';
}
