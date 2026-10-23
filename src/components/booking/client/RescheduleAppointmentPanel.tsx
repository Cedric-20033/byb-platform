// src/components/booking/client/RescheduleAppointmentPanel.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import type { SlotDTO } from '@/app/actions/booking/getAvailableSlots';
import { rescheduleAppointmentByTokenAction } from '@/app/actions/booking/rescheduleAppointment';
import { Button } from '@/components/ui/Button';
import type { ClientAppointmentSummary } from '@/lib/booking/clientAppointmentSummary';
import type { ActionErrorCode } from '@/lib/errors';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { SlotPicker } from '../SlotPicker';
import { ClientAppointmentSummaryCard, formatSlotDate } from './ClientAppointmentSummaryCard';

type RescheduleAppointmentPanelProps = {
  token: string;
  summary: ClientAppointmentSummary;
};

type Phase = 'pick' | 'confirm' | 'submitting' | 'done';

/** Erreurs après lesquelles la page serveur affichera un autre état (annulé, passé, lien invalide) : on la recharge. */
const STALE_PAGE_ERRORS: readonly ActionErrorCode[] = [
  'INVALID_STATUS_TRANSITION',
  'APPOINTMENT_IN_PAST',
  'APPOINTMENT_NOT_FOUND',
];

/**
 * Déplacement d'un rendez-vous par son client : même service, nouveau créneau. Le créneau se choisit dans
 * la grille du wizard (`SlotPicker`, à jour en continu), puis se confirme avant l'envoi.
 * Si le créneau est pris entre-temps, l'erreur s'affiche et la grille se rouvre, relue.
 */
export function RescheduleAppointmentPanel({ token, summary }: RescheduleAppointmentPanelProps) {
  const tReschedule = useTranslations('clientAppointment.reschedule');
  const errorMessage = useErrorMessage();
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('pick');
  const [selected, setSelected] = useState<SlotDTO | null>(null);
  const [error, setError] = useState<ActionErrorCode | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setPhase('submitting');
    setError(null);

    const result = await rescheduleAppointmentByTokenAction({ token, newSlotId: selected.id });
    if (result.success) {
      setPhase('done');
      return;
    }

    setError(result.error);
    // Retour à la grille : elle est remontée et relit les créneaux, celui qui vient d'être pris en aura disparu.
    setSelected(null);
    setPhase('pick');
    if (STALE_PAGE_ERRORS.includes(result.error)) router.refresh();
  }

  if (phase === 'done' && selected) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <CheckCircle2 size={48} className="text-[var(--color-primary)]" />
        <h2 className="text-xl font-[var(--font-display)] font-bold">{tReschedule('successTitle')}</h2>
        <p className="text-[var(--color-muted)]">
          {tReschedule('successMessage', {
            date: formatSlotDate(selected.date, locale),
            time: selected.startTime.slice(0, 5),
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {tReschedule('current')}
        </h2>
        <ClientAppointmentSummaryCard summary={summary} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--color-secondary)]">
          {errorMessage(error)}
        </p>
      )}

      {phase === 'pick' || !selected ? (
        <div>
          <h2 className="text-xl font-[var(--font-display)] font-bold mb-4">{tReschedule('pickTitle')}</h2>
          <SlotPicker
            serviceId={summary.serviceId}
            excludeSlotId={summary.slotId}
            onSelect={(slot) => {
              setError(null);
              setSelected(slot);
              setPhase('confirm');
            }}
          />
        </div>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="reschedule-confirm-title"
          aria-describedby="reschedule-confirm-message"
          className="space-y-4 p-4 rounded-[var(--radius-md)] border border-[var(--color-border)]"
        >
          <h2 id="reschedule-confirm-title" className="font-[var(--font-display)] font-bold">
            {tReschedule('confirmTitle')}
          </h2>
          <p id="reschedule-confirm-message" className="text-sm text-[var(--color-muted)]">
            {tReschedule('confirmMessage', {
              date: formatSlotDate(selected.date, locale),
              time: selected.startTime.slice(0, 5),
            })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" isLoading={phase === 'submitting'} onClick={handleConfirm}>
              {phase === 'submitting' ? tReschedule('submitting') : tReschedule('confirmAction')}
            </Button>
            <Button type="button" variant="outline" disabled={phase === 'submitting'} onClick={() => setPhase('pick')}>
              {tReschedule('back')}
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-[var(--color-muted)]">
        {tReschedule('cancelHint')}{' '}
        <Link
          href={getLocalizedPath(`/rdv/annuler/${encodeURIComponent(token)}`, locale)}
          className="font-medium text-[var(--color-primary)] underline"
        >
          {tReschedule('cancelAction')}
        </Link>
      </p>
    </div>
  );
}
