// src/components/admin/dashboard/UpcomingAppointmentsWidget.tsx
'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getUpcomingAppointmentsAction } from '@/app/actions/admin/dashboard';
import { ADMIN_ROUTES } from '@/lib/constants';
import { formatIsoDate } from '@/lib/date';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import type { Service } from '@/types';
import { AppointmentStatusBadge } from '../AppointmentStatusBadge';
import { buildOpenAppointmentQuery } from '../appointmentsUrlState';
import { DashboardWidget } from './DashboardWidget';
import { serviceName, shortTime } from './formatters';
import { unwrapAction } from './unwrapAction';
import { useWidgetQuery } from './useWidgetQuery';

/** Prochains rendez-vous actifs (en attente ou confirmés), du plus proche au plus lointain. */
export function UpcomingAppointmentsWidget({ services }: { services: Service[] }) {
  const t = useTranslations('admin.dashboard.upcoming');
  const tDashboard = useTranslations('admin.dashboard');
  const locale = useLocale() as Locale;

  const upcoming = useWidgetQuery(['admin', 'dashboard', 'upcoming'], async () =>
    unwrapAction(await getUpcomingAppointmentsAction()).items,
  );

  const appointmentsPath = getLocalizedPath(ADMIN_ROUTES.APPOINTMENTS, locale);

  return (
    <DashboardWidget
      title={t('title')}
      headerAction={
        <Link
          href={getLocalizedPath(ADMIN_ROUTES.CALENDAR, locale)}
          className="text-xs font-medium text-[var(--color-primary)] hover:underline"
        >
          {t('calendarLink')}
        </Link>
      }
      isPending={upcoming.isPending}
      error={upcoming.error}
      onRetry={upcoming.retry}
      isEmpty={upcoming.data?.length === 0}
      emptyMessage={t('empty')}
    >
      <ul className="divide-y divide-[var(--color-border)]">
        {upcoming.data?.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`${appointmentsPath}?${buildOpenAppointmentQuery(item.id)}`}
                className="text-sm font-medium hover:underline"
              >
                {item.clientName}
              </Link>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {t('meta', {
                  service: serviceName(services, item.serviceId, locale) ?? tDashboard('unknownService'),
                  time: shortTime(item.slotStartTime),
                })}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <p className="text-xs font-semibold capitalize">
                {formatIsoDate(item.slotDate, locale, { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <AppointmentStatusBadge status={item.status} />
            </div>
          </li>
        ))}
      </ul>
    </DashboardWidget>
  );
}
