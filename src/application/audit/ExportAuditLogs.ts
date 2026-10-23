// src/application/audit/ExportAuditLogs.ts
import type { AuditLogCursor } from '@/domain/audit/AuditLogCursor';
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import type { AuditLogReader } from '@/domain/audit/AuditLogReader';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { AdminActor } from '@/application/users/AdminActor';
import { MAX_AUDIT_PAGE_SIZE, toSearchCriteria, type AuditLogFilters } from './ListAuditLogs';

/** Plafond d'un export : la génération du fichier a lieu dans le navigateur, un journal entier le saturerait. */
export const MAX_AUDIT_EXPORT_ROWS = 5000;

export type ExportAuditLogsInput = AdminActor & { filters?: AuditLogFilters };

export type ExportAuditLogsResult = {
  entries: AuditLogEntry[];
  /** `true` si des lignes correspondantes ont été écartées au-delà du plafond (les plus anciennes). */
  truncated: boolean;
};

/**
 * Use case : rassemble les entrées du journal qui correspondent aux filtres.
 * L'export est lui-même tracé : savoir qui a extrait le journal en fait partie.
 */
export class ExportAuditLogs {
  constructor(
    private readonly reader: AuditLogReader,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute({ actorId, actorRole, filters }: ExportAuditLogsInput): Promise<ExportAuditLogsResult> {
    const criteria = toSearchCriteria(filters);
    const entries: AuditLogEntry[] = [];
    let cursor: AuditLogCursor | null = null;
    let truncated = false;

    do {
      const page = await this.reader.search(criteria, { limit: MAX_AUDIT_PAGE_SIZE, after: cursor });
      entries.push(...page.entries);
      cursor = page.nextCursor;

      if (cursor && entries.length >= MAX_AUDIT_EXPORT_ROWS) {
        truncated = true;
        break;
      }
    } while (cursor);

    const exported = entries.slice(0, MAX_AUDIT_EXPORT_ROWS);

    await this.auditLogger.log({
      actorId,
      actorRole,
      action: AuditAction.EXPORT_GENERATED,
      targetType: 'audit_log',
      targetId: null,
      metadata: { count: exported.length, truncated, filters: filters ?? {} },
    });

    return { entries: exported, truncated };
  }
}
