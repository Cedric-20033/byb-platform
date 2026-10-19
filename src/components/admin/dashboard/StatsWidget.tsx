// src/components/admin/dashboard/StatsWidget.tsx
'use client';

import { useTranslations } from 'next-intl';
import { CalendarCheck, CalendarClock, Hourglass, Ban } from 'lucide-react';
import { getDashboardStatsAction } from '@/app/actions/admin/dashboard';
import { StatCard } from '../StatCard';
import { AppointmentsChart } from '../AppointmentsChart';
import { DashboardWidget } from './DashboardWidget';
import { unwrapAction } from './unwrapAction';
import { useWidgetQuery } from './useWidgetQuery';

/**
 * Cartes d'indicateurs et graphique sur 14 jours. Tant que les chiffres ne sont pas là (chargement ou
 * échec), le cadre commun prend la place du bloc entier : jamais de cartes affichant de faux zéros.
 */
export function StatsWidget() {
  const t = useTranslations('admin.dashboard');
  const stats = useWidgetQuery(['admin', 'dashboard', 'stats'], async () =>
    unwrapAction(await getDashboardStatsAction()).stats,
  );

  if (!stats.data) {
    return (
      <DashboardWidget title={t('stats.title')} isPending={stats.isPending} error={stats.error} onRetry={stats.retry}>
        {null}
      </DashboardWidget>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label={t('statAppointmentsToday')} value={stats.data.appointmentsToday} tone="primary" />
        <StatCard icon={CalendarClock} label={t('statAppointmentsWeek')} value={stats.data.appointmentsThisWeek} tone="primary" />
        <StatCard icon={Hourglass} label={t('statPending')} value={stats.data.pendingCount} tone="secondary" />
        <StatCard icon={Ban} label={t('statBlockedSlots')} value={stats.data.blockedSlotsToday} tone="neutral" />
      </div>

      <AppointmentsChart title={t('chartTitle')} data={stats.data.last14Days} />
    </div>
  );
}
