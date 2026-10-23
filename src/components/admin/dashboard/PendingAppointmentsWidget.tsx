// src/components/admin/dashboard/PendingAppointmentsWidget.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  getPendingNotificationsAction,
  type NotificationItem,
} from '@/app/actions/admin/dashboard';
import { cancelAppointmentAction, confirmAppointmentAction } from '@/app/actions/admin/appointments';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { formatDate } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import type { Service } from '@/types';
import { Can } from '../Can';
import { ConfirmDialog } from '../ConfirmDialog';
import { buildOpenAppointmentQuery } from '../appointmentsUrlState';
import { invalidateAppointmentQueries } from '../appointmentQueryKeys';
import { DashboardWidget } from './DashboardWidget';
import { serviceName, shortTime } from './formatters';
import { unwrapAction } from './unwrapAction';
import { useWidgetQuery } from './useWidgetQuery';

/**
 * Demandes en attente de confirmation, avec confirmation et annulation en un clic.
 *
 * La lecture exige `appointments.view` (portée par le dashboard) ; les deux boutons n'apparaissent qu'avec
 * `appointments.edit`, droit que les actions serveur revérifient. Un admin en lecture seule voit donc la file
 * d'attente sans pouvoir la traiter. L'annulation passe par une confirmation : elle prévient le client par email.
 */
export function PendingAppointmentsWidget({ services }: { services: Service[] }) {
  const t = useTranslations('admin.dashboard.pending');
  const tDashboard = useTranslations('admin.dashboard');
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [cancelTarget, setCancelTarget] = useState<NotificationItem | null>(null);

  const pending = useWidgetQuery(['admin', 'dashboard', 'pending'], async () => {
    const { pendingCount, items } = unwrapAction(await getPendingNotificationsAction());
    return { pendingCount, items };
  });

  const onSettled = () => invalidateAppointmentQueries(queryClient);

  const confirmMutation = useMutation({
    mutationFn: async (appointmentId: string) => unwrapAction(await confirmAppointmentAction(appointmentId)),
    onSuccess: () => toast.success(t('confirmedToast')),
    onError: (error) => toast.error(errorMessage(error)),
    onSettled,
  });

  const cancelMutation = useMutation({
    mutationFn: async (appointmentId: string) => unwrapAction(await cancelAppointmentAction({ appointmentId })),
    onSuccess: () => toast.success(t('cancelledToast')),
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => {
      setCancelTarget(null);
      onSettled();
    },
  });

  const appointmentsPath = getLocalizedPath(ADMIN_ROUTES.APPOINTMENTS, locale);
  const { data } = pending;

  return (
    <>
      <DashboardWidget
        title={t('title')}
        headerAction={data && data.pendingCount > 0 ? <Badge tone="warning">{data.pendingCount}</Badge> : undefined}
        isPending={pending.isPending}
        error={pending.error}
        onRetry={pending.retry}
        isEmpty={data?.items.length === 0}
        emptyMessage={t('empty')}
      >
        <ul className="divide-y divide-[var(--color-border)]">
          {data?.items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 flex flex-wrap items-center justify-between gap-3">
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
                    date: formatDate(item.slotDate, locale),
                    time: shortTime(item.slotStartTime),
                  })}
                </p>
              </div>

              <Can domain="appointments" action="edit">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    isLoading={confirmMutation.isPending && confirmMutation.variables === item.id}
                    disabled={cancelMutation.isPending}
                    onClick={() => confirmMutation.mutate(item.id)}
                  >
                    {t('confirm')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={confirmMutation.isPending}
                    onClick={() => setCancelTarget(item)}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </Can>
            </li>
          ))}
        </ul>

        {data && data.pendingCount > data.items.length && (
          <Link
            href={`${appointmentsPath}?status=pending`}
            className="inline-block mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            {t('viewAll', { count: data.pendingCount })}
          </Link>
        )}
      </DashboardWidget>

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t('cancelTitle')}
        description={t('cancelDescription', { client: cancelTarget?.clientName ?? '' })}
        confirmLabel={t('cancelConfirm')}
        cancelLabel={t('keep')}
        destructive
        isSubmitting={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
      />
    </>
  );
}
