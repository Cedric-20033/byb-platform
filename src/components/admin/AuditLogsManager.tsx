// src/components/admin/AuditLogsManager.tsx
'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Download, Eye, RotateCcw, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateInput } from '@/components/ui/DateInput';
import { Select } from '@/components/ui/Select';
import { AuditLogDetailsDialog } from '@/components/admin/AuditLogDetailsDialog';
import { Can } from '@/components/admin/Can';
import {
  EMPTY_AUDIT_FILTERS,
  hasInvalidPeriod,
  toFilterPayload,
  type AuditFiltersState,
} from '@/components/admin/auditLogFilters';
import { buildAuditLogsCsv } from '@/components/admin/auditLogsCsv';
import { useAuditLabels } from '@/components/admin/useAuditLabels';
import { exportAuditLogsAction, listAuditLogsAction } from '@/app/actions/admin/auditLogs';
import { MAX_AUDIT_EXPORT_ROWS } from '@/application/audit/ExportAuditLogs';
import { AUDIT_TARGET_TYPES } from '@/domain/audit/AuditTargetType';
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { formatInstant, todayInBrussels } from '@/lib/date';
import { downloadTextFile } from '@/lib/downloadTextFile';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';

const AUDIT_QUERY_KEY = ['admin', 'audit-logs'] as const;
const ACTOR_ROLES = Object.values(ActorRole);
const ACTION_CODES = Object.values(AuditAction);

const ROLE_TONE: Record<ActorRole, 'info' | 'neutral' | 'warning'> = {
  [ActorRole.SUPERADMIN]: 'info',
  [ActorRole.ADMIN]: 'neutral',
  [ActorRole.CLIENT]: 'warning',
  [ActorRole.SYSTEM]: 'neutral',
};

/** Met en évidence ce qu'un administrateur doit repérer d'un coup d'œil : tentatives refusées et suppressions. */
function actionTone(action: string): 'danger' | 'warning' | 'neutral' {
  if (action === AuditAction.AUTH_LOGIN_FAILED) return 'danger';
  if (action.endsWith('_DELETED') || action === AuditAction.USER_DEACTIVATED) return 'warning';
  return 'neutral';
}

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'medium' };

/** Journal d'audit : filtres, pagination par curseur (« charger plus »), détail d'une entrée et export CSV. */
export function AuditLogsManager() {
  const t = useTranslations('admin.auditLogs');
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const labels = useAuditLabels();

  // `draft` suit le formulaire ; `applied` ne change qu'à la validation (un appel serveur par recherche, pas par frappe).
  const [draft, setDraft] = useState<AuditFiltersState>(EMPTY_AUDIT_FILTERS);
  const [applied, setApplied] = useState<AuditFiltersState>(EMPTY_AUDIT_FILTERS);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const payload = useMemo(() => toFilterPayload(applied), [applied]);
  const invalidPeriod = hasInvalidPeriod(draft);

  const query = useInfiniteQuery({
    queryKey: [...AUDIT_QUERY_KEY, payload],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => unwrapAction(await listAuditLogsAction({ filters: payload, cursor: pageParam })),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];

  function updateDraft<K extends keyof AuditFiltersState>(key: K, value: AuditFiltersState[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  /** Applique immédiatement (raccourcis du tableau, pastille, réinitialisation) et aligne le formulaire. */
  function applyNow(next: AuditFiltersState) {
    setDraft(next);
    setApplied(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!invalidPeriod) setApplied(draft);
  }

  function filterByActor(entry: AuditLogEntry) {
    if (entry.actorId) applyNow({ ...applied, actorId: entry.actorId, actorLabel: labels.actor(entry) });
  }

  function filterByTarget(entry: AuditLogEntry) {
    if (entry.targetId) applyNow({ ...applied, targetType: entry.targetType, targetId: entry.targetId });
  }

  function openDetails(entry: AuditLogEntry) {
    setSelected(entry);
    setDetailsOpen(true);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportAuditLogsAction({ filters: payload });
      if (!result.success) {
        toast.error(errorMessage(result.error));
        return;
      }
      if (result.entries.length === 0) {
        toast.info(t('export.empty'));
        return;
      }

      const csv = buildAuditLogsCsv(result.entries, {
        columns: {
          date: t('export.columns.date'),
          actor: t('export.columns.actor'),
          email: t('export.columns.email'),
          role: t('export.columns.role'),
          action: t('export.columns.action'),
          actionCode: t('export.columns.actionCode'),
          targetType: t('export.columns.targetType'),
          targetId: t('export.columns.targetId'),
          ip: t('export.columns.ip'),
          details: t('export.columns.details'),
        },
        separator: locale === 'en' ? ',' : ';',
        formatDate: (iso) => formatInstant(iso, locale, DATE_TIME_FORMAT),
        actionLabel: labels.action,
        targetTypeLabel: labels.targetType,
        roleLabel: labels.role,
      });

      downloadTextFile(`${t('export.fileName')}-${todayInBrussels()}.csv`, csv, 'text/csv');
      toast.success(t('export.success', { count: result.entries.length }));
      if (result.truncated) toast.warning(t('export.truncated', { max: MAX_AUDIT_EXPORT_ROWS }));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        aria-label={t('filters.title')}
        className="flex flex-wrap items-end gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <Select
          label={t('filters.role')}
          value={draft.actorRole}
          onChange={(e) => updateDraft('actorRole', e.target.value as AuditFiltersState['actorRole'])}
          className="min-w-[150px]"
        >
          <option value="">{t('filters.allRoles')}</option>
          {ACTOR_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`actorRoles.${role}`)}
            </option>
          ))}
        </Select>

        <Select
          label={t('filters.action')}
          value={draft.action}
          onChange={(e) => updateDraft('action', e.target.value)}
          className="min-w-[200px]"
        >
          <option value="">{t('filters.allActions')}</option>
          {ACTION_CODES.map((code) => (
            <option key={code} value={code}>
              {labels.action(code)}
            </option>
          ))}
        </Select>

        <Select
          label={t('filters.targetType')}
          value={draft.targetType}
          onChange={(e) => updateDraft('targetType', e.target.value)}
          className="min-w-[160px]"
        >
          <option value="">{t('filters.allTargetTypes')}</option>
          {AUDIT_TARGET_TYPES.map((type) => (
            <option key={type} value={type}>
              {labels.targetType(type)}
            </option>
          ))}
        </Select>

        <label className="flex flex-col gap-1 text-sm min-w-[200px] flex-1">
          <span className="font-medium">{t('filters.targetId')}</span>
          <input
            type="text"
            value={draft.targetId}
            onChange={(e) => updateDraft('targetId', e.target.value)}
            placeholder={t('filters.targetIdPlaceholder')}
            maxLength={100}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          />
        </label>

        <DateInput label={t('filters.dateFrom')} value={draft.dateFrom} onChange={(e) => updateDraft('dateFrom', e.target.value)} />
        <DateInput label={t('filters.dateTo')} value={draft.dateTo} onChange={(e) => updateDraft('dateTo', e.target.value)} />

        <Button type="submit" size="sm" disabled={invalidPeriod} className="normal-case font-medium tracking-normal">
          <Search size={15} />
          {t('filters.apply')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => applyNow(EMPTY_AUDIT_FILTERS)}
          className="normal-case font-medium tracking-normal"
        >
          <RotateCcw size={15} />
          {t('filters.reset')}
        </Button>

        {invalidPeriod && (
          <p role="alert" className="w-full text-xs text-[var(--color-secondary)]">
            {t('filters.invalidPeriod')}
          </p>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {applied.actorId && (
            <span className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold">
              {t('filters.actorChip', { name: applied.actorLabel })}
              <button
                type="button"
                onClick={() => applyNow({ ...applied, actorId: '', actorLabel: '' })}
                aria-label={t('filters.removeActor')}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--color-primary)]/20"
              >
                <X size={13} />
              </button>
            </span>
          )}
        </div>

        <Can domain="audit_logs" action="export">
          <Button
            variant="outline"
            size="sm"
            isLoading={isExporting}
            onClick={handleExport}
            className="normal-case font-medium tracking-normal"
          >
            <Download size={16} />
            {isExporting ? t('export.exporting') : t('export.csv')}
          </Button>
        </Can>
      </div>

      <Card className="overflow-hidden">
        {query.isPending ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>
        ) : query.isError ? (
          <div className="text-center py-6 space-y-3">
            <p role="alert" className="text-sm text-[var(--color-secondary)]">
              {errorMessage(query.error)}
            </p>
            <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('empty')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)] border-b border-[var(--color-border)]">
                    <th scope="col" className="px-4 py-3 font-semibold">{t('columns.date')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t('columns.actor')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t('columns.action')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t('columns.target')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">{t('columns.ip')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="sr-only">{t('columns.details')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatInstant(entry.createdAt, locale, DATE_TIME_FORMAT)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {entry.actorId ? (
                            <button
                              type="button"
                              onClick={() => filterByActor(entry)}
                              title={t('filterByActor')}
                              className="font-medium text-left hover:underline"
                            >
                              {labels.actor(entry)}
                            </button>
                          ) : (
                            <span className="font-medium">{labels.actor(entry)}</span>
                          )}
                          <Badge tone={ROLE_TONE[entry.actorRole]}>{labels.role(entry.actorRole)}</Badge>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge tone={actionTone(entry.action)}>{labels.action(entry.action)}</Badge>
                      </td>

                      <td className="px-4 py-3">
                        <span>{labels.targetType(entry.targetType)}</span>
                        {entry.targetId && (
                          <button
                            type="button"
                            onClick={() => filterByTarget(entry)}
                            title={t('filterByTarget')}
                            className="block max-w-[180px] truncate font-mono text-xs text-[var(--color-muted)] hover:underline"
                          >
                            {entry.targetId}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{entry.ipAddress ?? t('emptyValue')}</td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetails(entry)}
                          title={t('viewDetails')}
                          aria-label={`${t('viewDetails')} — ${labels.action(entry.action)}`}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 text-center border-t border-[var(--color-border)]">
              {query.hasNextPage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={query.isFetchingNextPage}
                  onClick={() => query.fetchNextPage()}
                  className="normal-case font-medium tracking-normal"
                >
                  {t('loadMore')}
                </Button>
              ) : (
                <p className="text-xs text-[var(--color-muted)]">{t('endOfLog')}</p>
              )}
            </div>
          </>
        )}
      </Card>

      <AuditLogDetailsDialog entry={selected} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
}
