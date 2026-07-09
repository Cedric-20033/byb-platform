// src/components/admin/DashboardOverview.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CalendarCheck, CalendarClock, Hourglass, Ban } from 'lucide-react';
import { getDashboardStatsAction } from '@/app/actions/admin/dashboard';
import { StatCard } from './StatCard';
import { AppointmentsChart } from './AppointmentsChart';

/**
 * Composant pour afficher l'aperçu du tableau de bord.
 * @returns 
 */
export function DashboardOverview() {
  const t = useTranslations('admin.dashboard');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const result = await getDashboardStatsAction();
      if (!result.success) throw new Error(result.error);
      return result.stats;
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label={t('statAppointmentsToday')} value={isLoading ? '—' : data!.appointmentsToday} tone="primary" />
        <StatCard icon={CalendarClock} label={t('statAppointmentsWeek')} value={isLoading ? '—' : data!.appointmentsThisWeek} tone="primary" />
        <StatCard icon={Hourglass} label={t('statPending')} value={isLoading ? '—' : data!.pendingCount} tone="secondary" />
        <StatCard icon={Ban} label={t('statBlockedSlots')} value={isLoading ? '—' : data!.blockedSlotsToday} tone="neutral" />
      </div>

      {data && <AppointmentsChart title={t('chartTitle')} data={data.last14Days} />}
    </div>
  );
}
