// src/components/admin/AppointmentStatusBadge.tsx
'use client';

import { useTranslations } from 'next-intl';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { Badge } from '@/components/ui/Badge';

const STATUS_TONE = {
  [AppointmentStatus.PENDING]: 'warning',
  [AppointmentStatus.CONFIRMED]: 'success',
  [AppointmentStatus.CANCELLED]: 'danger',
} as const;

const STATUS_LABEL_KEY = {
  [AppointmentStatus.PENDING]: 'statusPending',
  [AppointmentStatus.CONFIRMED]: 'statusConfirmed',
  [AppointmentStatus.CANCELLED]: 'statusCancelled',
} as const;

/** Pastille de statut partagée par le tableau et la fiche, pour que les deux restent cohérents. */
export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const t = useTranslations('admin.appointments');
  return <Badge tone={STATUS_TONE[status]}>{t(STATUS_LABEL_KEY[status])}</Badge>;
}
