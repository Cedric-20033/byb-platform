// src/application/audit/ListAuditLogs.ts
import type { AuditLogCursor } from '@/domain/audit/AuditLogCursor';
import type { AuditLogPage, AuditLogReader, AuditLogSearchCriteria } from '@/domain/audit/AuditLogReader';
import type { ActorRole } from '@/domain/shared/AuditLogger';
import { addDays, startOfDayInstant } from '@/domain/shared/IsoDate';

export const DEFAULT_AUDIT_PAGE_SIZE = 50;
export const MAX_AUDIT_PAGE_SIZE = 100;

/** Filtres tels que les saisit l'admin : la période est en JOURS calendaires belges. */
export type AuditLogFilters = {
  actorId?: string;
  actorRole?: ActorRole;
  action?: string;
  targetType?: string;
  targetId?: string;
  /** « AAAA-MM-JJ », inclus. */
  dateFrom?: string;
  /** « AAAA-MM-JJ », inclus (le jour entier). */
  dateTo?: string;
};

/**
 * Convertit les jours calendaires en bornes d'instants. Un filtre « Au 7 octobre »
 * doit inclure les événements de 23 h 30 ce jour-là : la borne haute est donc le
 * minuit SUIVANT, exclu — et non « 7 octobre 00:00 », qui les écarterait.
 */
export function toSearchCriteria(filters: AuditLogFilters = {}): AuditLogSearchCriteria {
  const { dateFrom, dateTo, ...criteria } = filters;

  return {
    ...criteria,
    occurredFrom: dateFrom ? startOfDayInstant(dateFrom).toISOString() : undefined,
    occurredBefore: dateTo ? startOfDayInstant(addDays(dateTo, 1)).toISOString() : undefined,
  };
}

export type ListAuditLogsInput = {
  filters?: AuditLogFilters;
  cursor?: AuditLogCursor | null;
  limit?: number;
};

/** Use case : une page du journal d'audit, filtrée, du plus récent au plus ancien. */
export class ListAuditLogs {
  constructor(private readonly reader: AuditLogReader) {}

  execute({ filters, cursor = null, limit }: ListAuditLogsInput = {}): Promise<AuditLogPage> {
    return this.reader.search(toSearchCriteria(filters), { limit: clampPageSize(limit), after: cursor });
  }
}

/** Borne la taille de page : une requête forgée ne doit pas pouvoir aspirer tout le journal d'un coup. */
function clampPageSize(requested: number | undefined): number {
  if (requested === undefined || !Number.isFinite(requested)) return DEFAULT_AUDIT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(requested), 1), MAX_AUDIT_PAGE_SIZE);
}
