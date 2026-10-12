// src/components/admin/AppointmentDetailsDialog.tsx
'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AppointmentHistory } from '@/components/admin/AppointmentHistory';
import { AppointmentStatusBadge } from '@/components/admin/AppointmentStatusBadge';
import { Can } from '@/components/admin/Can';
import { toMailtoHref, toTelHref } from '@/components/admin/contactLinks';
import { findService, findSubService } from '@/components/admin/serviceLookup';
import { Button } from '@/components/ui/Button';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { formatInstant } from '@/lib/date';
import type { Locale } from '@/lib/routing';
import { formatDate, t as translateField } from '@/lib/utils';
import type { Service } from '@/types';

type AppointmentDetailsDialogProps = {
  /** Conservé par le parent après la fermeture : le contenu ne disparaît pas pendant l'animation de sortie. */
  appointment: AppointmentListItemDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  services: Service[];
  /** Absent = bouton masqué (droit `appointments.edit` manquant), même convention que le tableau. */
  onConfirm?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
  /** Modifier les coordonnées : droit `appointments.edit`, rendez-vous actif uniquement. */
  onEdit?: (appointmentId: string) => void;
  /** Replanifier : droit `appointments.edit`, rendez-vous actif uniquement. */
  onReschedule?: (appointmentId: string) => void;
  /** Supprimer définitivement : droit `appointments.delete`, quel que soit le statut. */
  onDelete?: (appointmentId: string) => void;
  isConfirming?: boolean;
  confirmError?: string | null;
};

const LINK_CLASS = 'text-[var(--color-primary)] hover:underline break-all';

/** Fiche détaillée d'un rendez-vous : client, prestation, créneau, notes, historique et actions. */
export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  locale,
  services,
  onConfirm,
  onCancel,
  onEdit,
  onReschedule,
  onDelete,
  isConfirming = false,
  confirmError = null,
}: AppointmentDetailsDialogProps) {
  const t = useTranslations('admin.appointments');

  if (!appointment) return null;

  const { id, status, clientName, clientEmail, clientPhone, notes, slotDate, slotStartTime, slotEndTime, createdAt } =
    appointment;

  const service = findService(services, appointment.serviceId);
  const subService = appointment.subServiceId ? findSubService(services, appointment.subServiceId) : null;
  const serviceName = service ? translateField(service.name, locale) : t('details.unknownService');

  const canConfirm = onConfirm && status === AppointmentStatus.PENDING;
  const canCancel = onCancel && status !== AppointmentStatus.CANCELLED;
  // Un rendez-vous annulé est un historique : on ne le déplace ni ne le corrige.
  const isActive = status !== AppointmentStatus.CANCELLED;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center justify-between mb-1">
              <Dialog.Title className="text-lg font-[var(--font-display)] font-bold">{t('details.title')}</Dialog.Title>
              <Dialog.Close aria-label={t('details.close')} className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-[var(--color-muted)] mb-4">
              {t('details.description', { service: serviceName, date: formatDate(slotDate, locale) })}
            </Dialog.Description>

            <div className="space-y-5">
              <section aria-label={t('details.appointmentSection')}>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-[var(--color-muted)]">{t('details.status')}</dt>
                  <dd>
                    <AppointmentStatusBadge status={status} />
                  </dd>

                  <dt className="text-[var(--color-muted)]">{t('details.service')}</dt>
                  <dd className="min-w-0 break-words">{serviceName}</dd>

                  <dt className="text-[var(--color-muted)]">{t('details.subService')}</dt>
                  <dd className="min-w-0 break-words">
                    {subService ? translateField(subService.name, locale) : t('emptyValue')}
                  </dd>

                  <dt className="text-[var(--color-muted)]">{t('details.slot')}</dt>
                  <dd>
                    {formatDate(slotDate, locale)}
                    <span className="text-[var(--color-muted)]">
                      {' '}
                      · {slotStartTime.slice(0, 5)}–{slotEndTime.slice(0, 5)}
                    </span>
                  </dd>

                  <dt className="text-[var(--color-muted)]">{t('details.bookedOn')}</dt>
                  <dd>{formatInstant(createdAt, locale, { dateStyle: 'long', timeStyle: 'short' })}</dd>
                </dl>
              </section>

              <section aria-label={t('details.clientSection')}>
                <h3 className="text-sm font-semibold mb-2">{t('details.clientSection')}</h3>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-[var(--color-muted)]">{t('details.name')}</dt>
                  <dd className="min-w-0 break-words">{clientName}</dd>

                  <dt className="text-[var(--color-muted)]">{t('details.email')}</dt>
                  <dd className="min-w-0">
                    <a href={toMailtoHref(clientEmail)} className={LINK_CLASS}>
                      {clientEmail}
                    </a>
                  </dd>

                  <dt className="text-[var(--color-muted)]">{t('details.phone')}</dt>
                  <dd className="min-w-0">
                    <a href={toTelHref(clientPhone)} className={LINK_CLASS}>
                      {clientPhone}
                    </a>
                  </dd>
                </dl>
              </section>

              <section aria-label={t('details.notes')}>
                <h3 className="text-sm font-semibold mb-2">{t('details.notes')}</h3>
                {notes ? (
                  <p className="text-sm whitespace-pre-wrap break-words">{notes}</p>
                ) : (
                  <p className="text-sm text-[var(--color-muted)]">{t('details.noNotes')}</p>
                )}
              </section>

              <Can domain="audit_logs" action="view">
                <AppointmentHistory appointmentId={id} />
              </Can>

              <p className="text-xs text-[var(--color-muted)]">
                {t('details.reference')} : <span className="font-mono">{id}</span>
              </p>
            </div>

            {confirmError && (
              <p role="alert" className="mt-4 text-sm text-[var(--color-secondary)]">
                {confirmError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 mt-6">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(id)}
                  className="mr-auto px-3 py-1.5 text-sm rounded-[var(--radius-md)] text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10"
                >
                  {t('delete.open')}
                </button>
              )}
              {isActive && onEdit && (
                <Button size="sm" variant="ghost" onClick={() => onEdit(id)}>
                  {t('edit.open')}
                </Button>
              )}
              {isActive && onReschedule && (
                <Button size="sm" variant="ghost" onClick={() => onReschedule(id)}>
                  {t('reschedule.open')}
                </Button>
              )}
              {canCancel && (
                <Button size="sm" variant="ghost" onClick={() => onCancel?.(id)}>
                  {t('cancel')}
                </Button>
              )}
              {canConfirm && (
                <Button size="sm" variant="outline" isLoading={isConfirming} onClick={() => onConfirm?.(id)}>
                  {t('confirm')}
                </Button>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
