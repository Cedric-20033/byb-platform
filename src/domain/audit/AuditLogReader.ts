// src/domain/audit/AuditLogReader.ts
import type { ActorRole } from '@/domain/shared/AuditLogger';
import type { AuditLogCursor } from './AuditLogCursor';
import type { AuditLogEntry } from './AuditLogEntry';

/** Critères de recherche ; les bornes de période sont des INSTANTS (le use case convertit les jours calendaires). */
export type AuditLogSearchCriteria = {
  actorId?: string;
  actorRole?: ActorRole;
  action?: string;
  targetType?: string;
  targetId?: string;
  /** Inclusif, instant ISO UTC. */
  occurredFrom?: string;
  /** Exclusif, instant ISO UTC. */
  occurredBefore?: string;
};

export type AuditLogPageRequest = {
  limit: number;
  /** Dernière ligne de la page précédente ; `null` pour la première page. */
  after: AuditLogCursor | null;
};

export type AuditLogPage = {
  entries: AuditLogEntry[];
  /** `null` quand il n'y a plus de page suivante. */
  nextCursor: AuditLogCursor | null;
};

/**
 * Port de lecture du journal, volontairement séparé de `AuditLogger` (ISP) :
 * le logger est appelé par tous les use cases mutants et n'a besoin que d'écrire ;
 * seule la page du journal lit, et sous une permission qui lui est propre.
 * Tri imposé : du plus récent au plus ancien, départagé par `id` pour un ordre total.
 */
export interface AuditLogReader {
  search(criteria: AuditLogSearchCriteria, page: AuditLogPageRequest): Promise<AuditLogPage>;
}
