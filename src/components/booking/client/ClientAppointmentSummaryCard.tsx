// src/components/booking/client/ClientAppointmentSummaryCard.tsx
import { useLocale, useTranslations } from 'next-intl';
import type { ClientAppointmentSummary } from '@/lib/booking/clientAppointmentSummary';
import { formatIsoDate } from '@/lib/date';

/** Date longue et heure d'un créneau, dans la langue du visiteur : partagé par le récapitulatif et les confirmations. */
export function formatSlotDate(date: string, locale: string): string {
  return formatIsoDate(date, locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/** Récapitulatif d'un rendez-vous : de quoi le reconnaître, sans les coordonnées du client. */
export function ClientAppointmentSummaryCard({ summary }: { summary: ClientAppointmentSummary }) {
  const t = useTranslations('clientAppointment');
  const locale = useLocale();

  return (
    <dl className="grid grid-cols-2 gap-y-2 text-sm p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]">
      {summary.serviceName && (
        <>
          <dt className="text-[var(--color-muted)]">{t('summary.service')}</dt>
          <dd className="font-medium">{summary.serviceName}</dd>
        </>
      )}
      {summary.subServiceName && (
        <>
          <dt className="text-[var(--color-muted)]">{t('summary.subService')}</dt>
          <dd className="font-medium">{summary.subServiceName}</dd>
        </>
      )}
      <dt className="text-[var(--color-muted)]">{t('summary.date')}</dt>
      <dd className="font-medium">{formatSlotDate(summary.date, locale)}</dd>

      <dt className="text-[var(--color-muted)]">{t('summary.time')}</dt>
      <dd className="font-medium">{t('timeRange', { start: summary.startTime, end: summary.endTime })}</dd>

      <dt className="text-[var(--color-muted)]">{t('summary.status')}</dt>
      <dd className="font-medium">{t(`status.${summary.status}`)}</dd>
    </dl>
  );
}
