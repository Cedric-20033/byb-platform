// src/domain/audit/AuditLogEntry.ts
import type { ActorRole } from '@/domain/shared/AuditLogger';

/**
 * Ligne du journal d'audit telle qu'elle est LUE (modèle de lecture).
 * Distincte d'`AuditEntry`, qui décrit ce qu'on ÉCRIT : le lecteur ajoute l'identité
 * lisible de l'auteur et l'horodatage posé par la base.
 *
 * Objet plat (pas de classe) : il traverse tel quel la frontière Server Action → client.
 */
export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  /** Renseignés uniquement si le profil de l'auteur est lisible par l'appelant (voir RLS de `profiles`). */
  actorName: string | null;
  actorEmail: string | null;
  actorRole: ActorRole;
  /** Texte libre et non l'enum : une action retirée du code un jour doit rester affichable. */
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  /** Instant ISO 8601 UTC tel que stocké, microsecondes comprises (voir AuditLogCursor). */
  createdAt: string;
};
