// src/components/admin/HolidayConflictsDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import type { HolidayConflictDTO } from '@/app/actions/admin/holidays';
import { AdminDialog } from '@/components/admin/AdminDialog';
import { findService } from '@/components/admin/serviceLookup';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/routing';
import { formatDate, t as translateField } from '@/lib/utils';
import type { HolidayConflictResolutionValues } from '@/lib/validation/appointment';
import type { Service } from '@/types';

type HolidayConflictsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conservés par le parent après la fermeture : le contenu ne disparaît pas pendant l'animation de sortie. */
  conflicts: HolidayConflictDTO[];
  services: Service[];
  locale: Locale;
  /** Droit d'annuler des rendez-vous (`appointments.view` + `edit`) : sans lui, seule l'option « ignorer » est offerte. */
  canCancelAppointments: boolean;
  /** Doit rejeter en cas d'échec pour garder la modale ouverte. */
  onResolve: (resolution: HolidayConflictResolutionValues) => Promise<void>;
};

/**
 * Un congé tombe sur des rendez-vous déjà pris : l'admin choisit de les annuler (avec un message au client)
 * ou de créer le congé sans y toucher. Rien n'est créé tant qu'il n'a pas tranché.
 */
export function HolidayConflictsDialog({
  open,
  onOpenChange,
  conflicts,
  services,
  locale,
  canCancelAppointments,
  onResolve,
}: HolidayConflictsDialogProps) {
  const t = useTranslations('admin.holidays.conflicts');

  return (
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description', { count: conflicts.length })}
      closeLabel={t('close')}
    >
      <ConflictsForm
        conflicts={conflicts}
        services={services}
        locale={locale}
        canCancelAppointments={canCancelAppointments}
        onResolve={async (resolution) => {
          await onResolve(resolution);
          onOpenChange(false);
        }}
      />
    </AdminDialog>
  );
}

/** Formulaire isolé : monté à chaque ouverture, le message repart toujours vide. */
function ConflictsForm({
  conflicts,
  services,
  locale,
  canCancelAppointments,
  onResolve,
}: Pick<HolidayConflictsDialogProps, 'conflicts' | 'services' | 'locale' | 'canCancelAppointments'> & {
  onResolve: (resolution: HolidayConflictResolutionValues) => Promise<void>;
}) {
  const t = useTranslations('admin.holidays.conflicts');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState<'cancel' | 'ignore' | null>(null);

  async function resolve(resolution: HolidayConflictResolutionValues) {
    setSubmitting(resolution.mode);
    try {
      await onResolve(resolution);
    } catch {
      // L'erreur est déjà affichée par l'appelant (toast) ; la modale reste ouverte pour une autre décision.
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="max-h-56 overflow-y-auto divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
        {conflicts.map((conflict) => {
          const service = findService(services, conflict.serviceId);
          return (
            <li key={conflict.id} className="px-3 py-2 text-sm">
              <p className="font-medium">{conflict.clientName}</p>
              <p className="text-xs text-[var(--color-muted)]">
                {formatDate(conflict.slotDate, locale)} · {conflict.slotStartTime.slice(0, 5)} - {conflict.slotEndTime.slice(0, 5)}
                {service ? ` · ${translateField(service.name, locale)}` : ''}
              </p>
            </li>
          );
        })}
      </ul>

      {canCancelAppointments ? (
        <label className="block text-sm">
          <span className="font-medium block mb-1">{t('reasonLabel')}</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t('reasonPlaceholder')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        </label>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">{t('noCancelRight')}</p>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]">
          {t('abort')}
        </Dialog.Close>
        <Button variant="outline" isLoading={submitting === 'ignore'} disabled={submitting !== null} onClick={() => resolve({ mode: 'ignore' })}>
          {t('ignoreAndCreate')}
        </Button>
        {canCancelAppointments && (
          <Button
            isLoading={submitting === 'cancel'}
            disabled={submitting !== null}
            onClick={() => resolve({ mode: 'cancel', reason: reason.trim() || undefined })}
          >
            {t('cancelAndCreate')}
          </Button>
        )}
      </div>
    </div>
  );
}
