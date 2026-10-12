// src/components/admin/AppointmentsTable.tsx
'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import type { AppointmentSortField, SortDirection } from '@/domain/appointment/AppointmentRepository';
import { AppointmentStatusBadge } from '@/components/admin/AppointmentStatusBadge';
import { findService, findSubService } from '@/components/admin/serviceLookup';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatDate, t as translateField } from '@/lib/utils';
import type { Service } from '@/types';
import type { Locale } from '@/lib/routing';

interface AppointmentsTableProps {
  locale: Locale;
  services: Service[];
  appointments: AppointmentListItemDTO[];
  isLoading: boolean;
  /** Tri courant : absent = en-têtes non triables. */
  sort?: { field: AppointmentSortField; direction: SortDirection };
  onSortChange?: (field: AppointmentSortField) => void;
  /** Ouvre la fiche du rendez-vous — absent = le nom du client n'est pas cliquable. */
  onSelect?: (appointmentId: string) => void;
  /** Déclenche la confirmation d'un RDV — absent = bouton "Confirmer" masqué. */
  onConfirm?: (appointmentId: string) => void;
  /** id du RDV en cours de confirmation, pour désactiver son bouton précisément. */
  confirmingId?: string | null;
  /** Message d'erreur de la dernière tentative de confirmation, s'il y en a une. */
  confirmError?: string | null;
  /** Ouvre la modale d'annulation pour ce RDV — absent = bouton "Annuler" masqué. */
  onCancel?: (appointmentId: string) => void;
}

/** Liste des rendez-vous. Les actions n'apparaissent que si le parent fournit leur callback (cf. permissions). */
export function AppointmentsTable({
  locale,
  services,
  appointments,
  isLoading,
  sort,
  onSortChange,
  onSelect,
  onConfirm,
  confirmingId,
  confirmError,
  onCancel,
}: AppointmentsTableProps) {
  const t = useTranslations('admin.appointments');

  /** En-tête de colonne triable : bouton accessible et sens annoncé via aria-sort. */
  const sortableHeader = (field: AppointmentSortField, label: string) => {
    const current = sort?.field === field ? sort : null;
    const ariaSort = !current ? 'none' : current.direction === 'asc' ? 'ascending' : 'descending';
    const Icon = !current ? ArrowUpDown : current.direction === 'asc' ? ArrowUp : ArrowDown;

    return (
      <th className="px-4 py-3 font-semibold" aria-sort={ariaSort}>
        {onSortChange ? (
          <button
            type="button"
            onClick={() => onSortChange(field)}
            aria-label={t('sortBy', { column: label })}
            className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-[var(--color-foreground)]"
          >
            {label}
            <Icon size={12} aria-hidden="true" className={current ? undefined : 'opacity-40'} />
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

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
            {sortableHeader('clientName', t('columnClient'))}
            <th className="px-4 py-3 font-semibold">{t('columnService')}</th>
            <th className="px-4 py-3 font-semibold">{t('columnSubService')}</th>
            {sortableHeader('slotDate', t('columnDate'))}
            {sortableHeader('status', t('columnStatus'))}
            {sortableHeader('createdAt', t('columnCreatedAt'))}
            <th className="px-4 py-3 font-semibold">{t('columnNotes')}</th>
            {(onConfirm || onCancel) && <th className="px-4 py-3 font-semibold" />}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const { id, serviceId, subServiceId, clientName, clientEmail, status, createdAt, slotDate, slotStartTime, slotEndTime, notes } = appointment;
            const service = findService(services, serviceId);
            const subService = subServiceId ? findSubService(services, subServiceId) : null;
            return (
              <tr key={id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-raised)] transition-colors">
                <td className="px-4 py-3">
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(id)}
                      aria-label={t('details.open', { name: clientName })}
                      className="font-medium text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-sm"
                    >
                      {clientName}
                    </button>
                  ) : (
                    <p className="font-medium">{clientName}</p>
                  )}
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
                  <AppointmentStatusBadge status={status} />
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
