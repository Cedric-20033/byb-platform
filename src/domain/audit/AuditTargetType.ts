// src/domain/audit/AuditTargetType.ts

/**
 * Types de cible connus du journal (`audit_logs.target_type`), utilisés pour le filtre
 * de l'interface. La colonne reste du texte libre : une cible inconnue s'affiche telle quelle.
 */
export const AUDIT_TARGET_TYPES = ['appointment', 'slot', 'holiday', 'service', 'user', 'auth', 'audit_log'] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];
