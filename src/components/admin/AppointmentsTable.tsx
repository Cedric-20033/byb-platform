// src/components/admin/AppointmentsTable.tsx
'use client';

import { useTranslations } from 'next-intl';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, t as translateField } from '@/lib/utils';
import { getServiceById } from '@/data/services';
import type { Locale } from '@/lib/routing';

interface AppointmentsTableProps {
  locale: Locale;
  appointments: AppointmentListItemDTO[];
  isLoading: boolean;
}

const STATUS_TONE = {
  [AppointmentStatus.PENDING]: 'warning',
  [AppointmentStatus.CONFIRMED]: 'success',
  [AppointmentStatus.CANCELLED]: 'danger',
} as const;

/**
 * Composant pour afficher la liste des rendez-vous.
 * @param param0 
 * @returns 
 */
export function AppointmentsTable({ locale, appointments, isLoading }: AppointmentsTableProps) {
  const t = useTranslations('admin.appointments');

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-sm text-[var(--color-muted)]">{t('title')}…</Card>
    );
  }

  if (appointments.length === 0) {
    return <Card className="p-8 text-center text-sm text-[var(--color-muted)]">{t('noResults')}</Card>;
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <th className="px-4 py-3 font-semibold">{t('columnClient')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnService')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnDate')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnStatus')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnCreatedAt')}</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const { id, serviceId, clientName, clientEmail, status, createdAt, slotDate, slotStartTime, slotEndTime } = appointment;
            const service = getServiceById(serviceId);
            return (
              <tr key={id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-raised)] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{clientName}</p>
                  <p className="text-xs text-[var(--color-muted)]">{clientEmail}</p>
                </td>
                <td className="px-4 py-3">{service ? translateField(service.name, locale) : serviceId}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(slotDate, locale)}
                  <span className="text-[var(--color-muted)]"> · {slotStartTime.slice(0, 5)}–{slotEndTime.slice(0, 5)}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[status]}>
                    {t(`status${capitalize(status)}`)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">
                  {formatDate(createdAt, locale)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
