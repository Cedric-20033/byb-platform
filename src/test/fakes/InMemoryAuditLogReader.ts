// src/test/fakes/InMemoryAuditLogReader.ts
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import type {
  AuditLogPage,
  AuditLogPageRequest,
  AuditLogReader,
  AuditLogSearchCriteria,
} from '@/domain/audit/AuditLogReader';

/**
 * Lecteur en mémoire : mêmes critères, même ordre total (created_at puis id, décroissant)
 * et même pagination par curseur que l'implémentation Supabase.
 * Les `createdAt` des fixtures doivent suivre le format de `Date.toISOString()` (comparable en texte).
 */
export class InMemoryAuditLogReader implements AuditLogReader {
  /** Nombre d'appels à `search` : permet de vérifier qu'un export pagine au lieu de tout lire d'un coup. */
  searchCalls = 0;

  constructor(private readonly entries: AuditLogEntry[] = []) {}

  async search(criteria: AuditLogSearchCriteria, { limit, after }: AuditLogPageRequest): Promise<AuditLogPage> {
    this.searchCalls++;

    const ordered = this.entries.filter((entry) => matches(entry, criteria)).sort(byNewestFirst);
    const start = after ? ordered.findIndex((entry) => isAfterCursor(entry, after)) : 0;
    if (start === -1) return { entries: [], nextCursor: null };

    const page = ordered.slice(start, start + limit);
    const last = page.at(-1);
    const hasMore = start + limit < ordered.length;

    return { entries: page, nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null };
  }
}

function matches(entry: AuditLogEntry, criteria: AuditLogSearchCriteria): boolean {
  if (criteria.actorId && entry.actorId !== criteria.actorId) return false;
  if (criteria.actorRole && entry.actorRole !== criteria.actorRole) return false;
  if (criteria.action && entry.action !== criteria.action) return false;
  if (criteria.targetType && entry.targetType !== criteria.targetType) return false;
  if (criteria.targetId && entry.targetId !== criteria.targetId) return false;
  if (criteria.occurredFrom && entry.createdAt < criteria.occurredFrom) return false;
  if (criteria.occurredBefore && entry.createdAt >= criteria.occurredBefore) return false;
  return true;
}

function byNewestFirst(a: AuditLogEntry, b: AuditLogEntry): number {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

/** Vrai pour les lignes situées strictement après le curseur dans l'ordre décroissant. */
function isAfterCursor(entry: AuditLogEntry, cursor: { createdAt: string; id: string }): boolean {
  return entry.createdAt < cursor.createdAt || (entry.createdAt === cursor.createdAt && entry.id < cursor.id);
}
