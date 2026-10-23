// src/components/admin/dashboard/FreeSlotsWidget.tsx
'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getFreeSlotsOutlookAction } from '@/app/actions/admin/dashboard';
import { ADMIN_ROUTES } from '@/lib/constants';
import { formatIsoDate } from '@/lib/date';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { cn } from '@/lib/utils';
import { DashboardWidget } from './DashboardWidget';
import { unwrapAction } from './unwrapAction';
import { useWidgetQuery } from './useWidgetQuery';

/**
 * Créneaux encore réservables sur les 7 prochains jours. Zéro créneau n'est pas un état « vide » banal :
 * aucun visiteur ne peut réserver, le message invite donc à en générer.
 */
export function FreeSlotsWidget() {
  const t = useTranslations('admin.dashboard.freeSlots');
  const locale = useLocale() as Locale;

  const outlook = useWidgetQuery(['admin', 'dashboard', 'freeSlots'], async () =>
    unwrapAction(await getFreeSlotsOutlookAction()).outlook,
  );

  const { data } = outlook;

  return (
    <DashboardWidget
      title={t('title')}
      subtitle={t('subtitle')}
      headerAction={
        <Link
          href={getLocalizedPath(ADMIN_ROUTES.SLOTS, locale)}
          className="text-xs font-medium text-[var(--color-primary)] hover:underline"
        >
          {t('manage')}
        </Link>
      }
      isPending={outlook.isPending}
      error={outlook.error}
      onRetry={outlook.retry}
      isEmpty={data?.total === 0}
      emptyMessage={t('none')}
    >
      {data && (
        <div className="space-y-4">
          <p className="text-lg font-[var(--font-display)] font-black">{t('total', { count: data.total })}</p>

          <ul className="grid grid-cols-7 gap-2">
            {data.days.map((day) => (
              <li
                key={day.date}
                aria-label={t('day', {
                  date: formatIsoDate(day.date, locale, { weekday: 'long', day: 'numeric', month: 'long' }),
                  count: day.count,
                })}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-[var(--radius-md)] py-2 text-center',
                  day.count > 0
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-muted)]',
                )}
              >
                <span className="text-[10px] uppercase font-semibold" aria-hidden>
                  {formatIsoDate(day.date, locale, { weekday: 'short' })}
                </span>
                <span className="text-xs" aria-hidden>
                  {formatIsoDate(day.date, locale, { day: 'numeric' })}
                </span>
                <span className="text-base font-bold leading-none" aria-hidden>
                  {day.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardWidget>
  );
}
