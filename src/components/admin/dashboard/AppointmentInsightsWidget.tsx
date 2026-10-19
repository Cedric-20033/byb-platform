// src/components/admin/dashboard/AppointmentInsightsWidget.tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getAppointmentInsightsAction } from '@/app/actions/admin/dashboard';
import { formatIsoDate } from '@/lib/date';
import type { Service } from '@/types';
import { DashboardWidget } from './DashboardWidget';
import { serviceName } from './formatters';
import { ServiceActivityChart } from './ServiceActivityChart';
import { unwrapAction } from './unwrapAction';
import { useWidgetQuery } from './useWidgetQuery';

/** Taux d'annulation et rendez-vous par service sur la période (30 jours passés, 30 à venir). */
export function AppointmentInsightsWidget({ services }: { services: Service[] }) {
  const t = useTranslations('admin.dashboard.insights');
  const tDashboard = useTranslations('admin.dashboard');
  const locale = useLocale();

  const insights = useWidgetQuery(['admin', 'dashboard', 'insights'], async () =>
    unwrapAction(await getAppointmentInsightsAction()).insights,
  );

  const { data } = insights;
  const shortDate = (isoDate: string) => formatIsoDate(isoDate, locale, { day: 'numeric', month: 'short' });

  return (
    <DashboardWidget
      title={t('title')}
      subtitle={data ? t('period', { from: shortDate(data.from), to: shortDate(data.to) }) : undefined}
      isPending={insights.isPending}
      error={insights.error}
      onRetry={insights.retry}
      isEmpty={data?.total === 0}
      emptyMessage={t('empty')}
    >
      {data && data.cancellationRate !== null && (
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-[var(--font-display)] font-black leading-none">
              {new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(data.cancellationRate)}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              {t('cancellationRate')} · {t('cancellationDetail', { cancelled: data.cancelled, total: data.total })}
            </p>
          </div>

          {data.byService.length > 0 && (
            <ServiceActivityChart
              label={t('chartLabel')}
              data={data.byService.map(({ serviceId, count }) => ({
                name: serviceName(services, serviceId, locale) ?? tDashboard('unknownService'),
                count,
              }))}
            />
          )}
        </div>
      )}
    </DashboardWidget>
  );
}
