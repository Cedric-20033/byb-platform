// src/components/admin/AuditLogDetailsDialog.tsx
'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { describeMetadata, type MetadataScalar } from '@/components/admin/auditMetadata';
import { useAuditLabels } from '@/components/admin/useAuditLabels';
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import { formatInstant } from '@/lib/date';

type AuditLogDetailsDialogProps = {
  /** Conservée par le parent après la fermeture : le contenu ne disparaît pas pendant l'animation de sortie. */
  entry: AuditLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Détail d'une entrée du journal : résumé, informations enregistrées (avec avant → après) et JSON brut. */
export function AuditLogDetailsDialog({ entry, open, onOpenChange }: AuditLogDetailsDialogProps) {
  const t = useTranslations('admin.auditLogs');
  const locale = useLocale();
  const labels = useAuditLabels();

  const date = entry ? formatInstant(entry.createdAt, locale, { dateStyle: 'long', timeStyle: 'medium' }) : '';
  const rows = entry ? describeMetadata(entry.metadata) : [];

  /** Les booléens et les valeurs vides sont traduits ; tout le reste est affiché tel qu'enregistré. */
  function formatScalar(value: MetadataScalar): string {
    if (value === null || value === '') return t('details.emptyList');
    if (typeof value === 'boolean') return t(value ? 'details.yes' : 'details.no');
    return String(value);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center justify-between mb-1">
              <Dialog.Title className="text-lg font-[var(--font-display)] font-bold">{t('details.title')}</Dialog.Title>
              <Dialog.Close aria-label={t('details.close')} className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-[var(--color-muted)] mb-4">
              {entry ? t('details.description', { action: labels.action(entry.action), date }) : ''}
            </Dialog.Description>

            {entry && (
              <div className="space-y-5">
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-[var(--color-muted)]">{t('details.actor')}</dt>
                  <dd className="min-w-0 break-words">
                    {labels.actor(entry)}
                    {entry.actorEmail && entry.actorEmail !== labels.actor(entry) && (
                      <span className="block text-xs text-[var(--color-muted)]">{entry.actorEmail}</span>
                    )}
                  </dd>

                  <dt className="text-[var(--color-muted)]">{t('details.role')}</dt>
                  <dd>{labels.role(entry.actorRole)}</dd>

                  <dt className="text-[var(--color-muted)]">{t('details.action')}</dt>
                  <dd>{labels.action(entry.action)}</dd>

                  <dt className="text-[var(--color-muted)]">{t('details.target')}</dt>
                  <dd className="min-w-0 break-words">
                    {labels.targetType(entry.targetType)}
                    {entry.targetId && <span className="block font-mono text-xs text-[var(--color-muted)]">{entry.targetId}</span>}
                  </dd>

                  <dt className="text-[var(--color-muted)]">{t('details.ip')}</dt>
                  <dd className="font-mono text-xs self-center">{entry.ipAddress ?? t('emptyValue')}</dd>
                </dl>

                <section aria-labelledby="audit-metadata-title">
                  <h3 id="audit-metadata-title" className="text-sm font-semibold mb-2">
                    {t('details.metadataTitle')}
                  </h3>

                  {rows.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">{t('details.noMetadata')}</p>
                  ) : (
                    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                      {rows.map((row, index) => (
                        <div key={`${row.label}-${index}`} className="contents">
                          <dt className="font-mono text-xs text-[var(--color-muted)] self-center break-all">{row.label}</dt>
                          <dd className="min-w-0 break-words">
                            {row.kind === 'value' ? (
                              formatScalar(row.value)
                            ) : typeof row.to === 'boolean' ? (
                              // Diff de permission : seul l'état final compte (accordé / retiré).
                              <Badge tone={row.to ? 'success' : 'danger'}>{t(row.to ? 'details.granted' : 'details.revoked')}</Badge>
                            ) : (
                              <>
                                <span className="text-[var(--color-muted)] line-through">{formatScalar(row.from)}</span>
                                <span aria-hidden="true"> → </span>
                                <span className="font-medium">{formatScalar(row.to)}</span>
                              </>
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>

                <details className="text-sm">
                  <summary className="cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                    {t('details.rawJson')}
                  </summary>
                  <pre className="mt-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] text-xs overflow-x-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
