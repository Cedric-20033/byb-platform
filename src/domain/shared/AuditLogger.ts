// src/domain/shared/AuditLogger.ts

/**
 * Port de sortie : contrat pour la journalisation des actions (audit log).
 * Toute action importante doit être tracée via cette interface.
 *
 * Utilisé pour : sécurité, conformité RGPD, débogage, traçabilité.
 */
export interface AuditLogger {
  log(entry: AuditEntry): Promise<void>;
}

export type AuditEntry = {
  actorId: string | null;      // null si action système automatisée
  actorRole: ActorRole;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
};

export enum ActorRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  CLIENT = 'client',
  SYSTEM = 'system',
}

/**
 * Actions traçables dans le système.
 * Convention de nommage : DOMAINE_ACTION en majuscules.
 */
export enum AuditAction {
  // Rendez-vous
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_CREATED_BY_ADMIN = 'APPOINTMENT_CREATED_BY_ADMIN',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_DELETED = 'APPOINTMENT_DELETED',

  // Créneaux
  SLOT_CREATED = 'SLOT_CREATED',
  SLOT_BLOCKED = 'SLOT_BLOCKED',
  SLOTS_BLOCKED_IN_RANGE = 'SLOTS_BLOCKED_IN_RANGE',
  SLOTS_DELETED = 'SLOTS_DELETED',
  SLOT_UNBLOCKED = 'SLOT_UNBLOCKED',

  // Jours fériés / congés
  HOLIDAY_CREATED = 'HOLIDAY_CREATED',
  HOLIDAY_DELETED = 'HOLIDAY_DELETED',

  // Services
  SERVICE_CREATED = 'SERVICE_CREATED',
  SERVICE_UPDATED = 'SERVICE_UPDATED',
  SERVICE_DELETED = 'SERVICE_DELETED',

  // Témoignages
  TESTIMONIAL_CREATED = 'TESTIMONIAL_CREATED',
  TESTIMONIAL_UPDATED = 'TESTIMONIAL_UPDATED',
  TESTIMONIAL_DELETED = 'TESTIMONIAL_DELETED',

  // Réglages de l'entreprise
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',

  // Utilisateurs & permissions
  USER_INVITED = 'USER_INVITED',
  USER_INVITATION_RESENT = 'USER_INVITATION_RESENT',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_REACTIVATED = 'USER_REACTIVATED',
  USER_ROLE_UPDATED = 'USER_ROLE_UPDATED',
  USER_PERMISSIONS_UPDATED = 'USER_PERMISSIONS_UPDATED',

  // Authentification (cible : le compte concerné, targetType 'auth')
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  AUTH_PASSWORD_CHANGED = 'AUTH_PASSWORD_CHANGED',

  // Système
  EMAIL_SENT = 'EMAIL_SENT',
  EXPORT_GENERATED = 'EXPORT_GENERATED',

  // Conformité RGPD (écrites par les fonctions SQL de la migration 0018, jamais avec des coordonnées de client)
  CLIENT_DATA_ERASED = 'CLIENT_DATA_ERASED',
  APPOINTMENTS_ANONYMIZED = 'APPOINTMENTS_ANONYMIZED',
}
