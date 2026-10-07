// src/components/admin/auditLogsCsv.ts
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import type { ActorRole } from '@/domain/shared/AuditLogger';

const COLUMN_ORDER = [
  'date',
  'actor',
  'email',
  'role',
  'action',
  'actionCode',
  'targetType',
  'targetId',
  'ip',
  'details',
] as const;

export type AuditCsvColumn = (typeof COLUMN_ORDER)[number];

export type AuditCsvOptions = {
  /** En-têtes déjà traduits. */
  columns: Record<AuditCsvColumn, string>;
  /** « , » pour une locale anglophone, « ; » là où le tableur utilise la virgule comme décimale (fr, de). */
  separator: ',' | ';';
  formatDate: (isoInstant: string) => string;
  actionLabel: (code: string) => string;
  targetTypeLabel: (type: string) => string;
  roleLabel: (role: ActorRole) => string;
};

/** Caractères qu'un tableur interprète comme le début d'une formule. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Cellule CSV sûre : échappement RFC 4180 ET neutralisation des formules.
 *
 * Le `metadata` et les noms contiennent du texte saisi par des tiers (motif d'annulation d'un
 * rendez-vous, nom d'un invité). Une cellule « =HYPERLINK(...) » ouverte dans Excel s'exécuterait
 * (injection CSV) : on la préfixe d'une apostrophe, qui force l'affichage en texte.
 */
function escapeCell(value: string, separator: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  const needsQuotes = safe.includes('"') || safe.includes(separator) || /[\r\n]/.test(safe);
  return needsQuotes ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Construit le contenu CSV (sans BOM : l'ajout est un détail du téléchargement). */
export function buildAuditLogsCsv(entries: AuditLogEntry[], options: AuditCsvOptions): string {
  const { separator } = options;
  const toLine = (cells: string[]) => cells.map((cell) => escapeCell(cell, separator)).join(separator);

  const header = toLine(COLUMN_ORDER.map((column) => options.columns[column]));

  const lines = entries.map((entry) =>
    toLine([
      options.formatDate(entry.createdAt),
      entry.actorName ?? '',
      entry.actorEmail ?? '',
      options.roleLabel(entry.actorRole),
      options.actionLabel(entry.action),
      entry.action,
      options.targetTypeLabel(entry.targetType),
      entry.targetId ?? '',
      entry.ipAddress ?? '',
      Object.keys(entry.metadata).length > 0 ? JSON.stringify(entry.metadata) : '',
    ]),
  );

  return [header, ...lines].join('\r\n');
}
