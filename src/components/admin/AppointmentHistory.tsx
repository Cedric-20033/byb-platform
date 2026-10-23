// src/components/admin/AppointmentHistory.tsx
'use client';

import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { listAppointmentHistoryAction } from '@/app/actions/admin/appointments';
import { Button } from '@/components/ui/Button';
import { describeMetadata } from '@/components/admin/auditMetadata';
import { useAuditLabels } from '@/components/admin/useAuditLabels';
import { formatInstant } from '@/lib/date';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';

/**
 * Chronologie des actions menées sur un rendez-vous (demande, confirmation, annulation…),
 * lue dans le journal d'audit. À monter sous `<Can domain="audit_logs" action="view">`.
 */
export function AppointmentHistory({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations('admin.appointments.details.history');
  const locale = useLocale();
  const labels = useAuditLabels();
  const errorMessage = useErrorMessage();
  const titleId = useId();

  // La clé commence par ['admin', 'appointments'] : confirmer ou annuler un RDV invalide donc
  // aussi cet historique, qui se met à jour sans rechargement.
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'appointments', 'history', appointmentId],
    queryFn: async () => unwrapAction(await listAppointmentHistoryAction(appointmentId)).entries,
  });

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-sm font-semibold mb-2">
        {t('title')}
      </h3>

      {isPending && <p className="text-sm text-[var(--color-muted)]">{t('loading')}</p>}

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-3 text-sm text-[var(--color-secondary)]">
          <span>{errorMessage(error)}</span>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            {t('retry')}
          </Button>
        </div>
      )}

      {data && data.length === 0 && <p className="text-sm text-[var(--color-muted)]">{t('empty')}</p>}

      {data && data.length > 0 && (
        <ol className="space-y-3">
          {data.map((entry) => {
            const rows = describeMetadata(entry.metadata);
            const date = formatInstant(entry.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' });

            return (
              <li key={entry.id} className="pl-3 border-l-2 border-[var(--color-border)]">
                <p className="text-sm font-medium">{labels.action(entry.action)}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {t('meta', { actor: labels.actor(entry), date })}
                </p>

                {rows.length > 0 && (
                  <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                    {rows.map((row, index) => (
                      <div key={`${row.label}-${index}`} className="contents">
                        {/* Les champs connus sont traduits ; un champ inconnu garde sa clé brute. */}
                        <dt className="text-[var(--color-muted)]">
                          {t.has(`fields.${row.label}`) ? t(`fields.${row.label}`) : row.label}
                        </dt>
                        <dd className="min-w-0 break-words">
                          {row.kind === 'value' ? (
                            labels.scalar(row.value)
                          ) : (
                            <>
                              <span className="text-[var(--color-muted)] line-through">{labels.scalar(row.from)}</span>
                              <span aria-hidden="true"> → </span>
                              <span className="font-medium">{labels.scalar(row.to)}</span>
                            </>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
