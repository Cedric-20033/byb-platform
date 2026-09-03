// src/components/admin/AppointmentsTable.tsx
'use client';

import { useTranslations } from 'next-intl';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, t as translateField } from '@/lib/utils';
import type { Service } from '@/types';
import type { Locale } from '@/lib/routing';

interface AppointmentsTableProps {
  locale: Locale;
  services: Service[];
  appointments: AppointmentListItemDTO[];
  isLoading: boolean;
  /** Déclenche la confirmation d'un RDV — absent = colonne actions masquée. */
  onConfirm?: (appointmentId: string) => void;
  /** id du RDV en cours de confirmation, pour désactiver son bouton précisément. */
  confirmingId?: string | null;
  /** Message d'erreur de la dernière tentative de confirmation, s'il y en a une. */
  confirmError?: string | null;
  /** Ouvre la modale d'annulation pour ce RDV — absent = bouton "Annuler" masqué. */
  onCancel?: (appointmentId: string) => void;
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
export function AppointmentsTable({
  locale,
  services,
  appointments,
  isLoading,
  onConfirm,
  confirmingId,
  confirmError,
  onCancel,
}: AppointmentsTableProps) {
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
      {confirmError && (
        <p className="px-4 py-2 text-sm text-[var(--color-secondary)] bg-[var(--color-secondary)]/10">{confirmError}</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
            <th className="px-4 py-3 font-semibold">{t('columnClient')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnService')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnSubService')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnDate')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnStatus')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnCreatedAt')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnNotes')}</th>
            {(onConfirm || onCancel) && <th className="px-4 py-3 font-semibold" />}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const { id, serviceId, subServiceId, clientName, clientEmail, status, createdAt, slotDate, slotStartTime, slotEndTime, notes } = appointment;
            const service = services.find((s) => s.id === serviceId);
            const subService = subServiceId ? findSubService(services, subServiceId) : null;
            return (
              <tr key={id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-raised)] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{clientName}</p>
                  <p className="text-xs text-[var(--color-muted)]">{clientEmail}</p>
                </td>
                <td className="px-4 py-3">{service ? translateField(service.name, locale) : serviceId}</td>
                <td className="px-4 py-3">
                  {subService ? translateField(subService.name, locale) : <span className="text-[var(--color-muted)]">{t('emptyValue')}</span>}
                </td>
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
                <td className="px-4 py-3 max-w-[16rem]">
                  {notes ? (
                    <p className="truncate text-[var(--color-muted)]" title={notes}>{notes}</p>
                  ) : (
                    <span className="text-[var(--color-muted)]">{t('emptyValue')}</span>
                  )}
                </td>
                {(onConfirm || onCancel) && (
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    {/* Seul un RDV en attente peut être confirmé — cf. Appointment.assertCanTransitionTo */}
                    {onConfirm && status === AppointmentStatus.PENDING && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={confirmingId === id}
                        onClick={() => onConfirm(id)}
                      >
                        {t('confirm')}
                      </Button>
                    )}
                    {/* Annulable tant que le RDV n'est pas déjà annulé — pending et confirmed sont les deux éligibles. */}
                    {onCancel && status !== AppointmentStatus.CANCELLED && (
                      <Button size="sm" variant="ghost" onClick={() => onCancel(id)}>
                        {t('cancel')}
                      </Button>
                    )}
                  </td>
                )}
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

/** Un service embarque ses sous-services (voir Service.subServices) — on les cherche tous. */
function findSubService(services: Service[], subServiceId: string) {
  for (const service of services) {
    const match = service.subServices.find((sub) => sub.id === subServiceId);
    if (match) return match;
  }
  return null;
}
