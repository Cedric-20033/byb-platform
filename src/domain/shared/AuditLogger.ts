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
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_DELETED = 'APPOINTMENT_DELETED',

  // Créneaux
  SLOT_CREATED = 'SLOT_CREATED',
  SLOT_BLOCKED = 'SLOT_BLOCKED',
  SLOT_UNBLOCKED = 'SLOT_UNBLOCKED',

  // Jours fériés / congés
  HOLIDAY_CREATED = 'HOLIDAY_CREATED',
  HOLIDAY_DELETED = 'HOLIDAY_DELETED',

  // Services
  SERVICE_CREATED = 'SERVICE_CREATED',
  SERVICE_UPDATED = 'SERVICE_UPDATED',
  SERVICE_DELETED = 'SERVICE_DELETED',

  // Utilisateurs & permissions
  USER_ROLE_UPDATED = 'USER_ROLE_UPDATED',
  USER_PERMISSIONS_UPDATED = 'USER_PERMISSIONS_UPDATED',

  // Système
  EMAIL_SENT = 'EMAIL_SENT',
  EXPORT_GENERATED = 'EXPORT_GENERATED',
}
