// src/components/booking/client/CancelAppointmentPanel.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { cancelAppointmentByTokenAction } from '@/app/actions/booking/cancelAppointment';
import { Button } from '@/components/ui/Button';
import { LINK_BUTTON_CLASSES } from '@/components/ui/linkButtonClasses';
import type { ClientAppointmentSummary } from '@/lib/booking/clientAppointmentSummary';
import type { ActionErrorCode } from '@/lib/errors';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { ClientAppointmentSummaryCard } from './ClientAppointmentSummaryCard';

type CancelAppointmentPanelProps = {
  token: string;
  summary: ClientAppointmentSummary;
};

type Phase = 'idle' | 'confirming' | 'submitting' | 'done';

/** Erreurs après lesquelles la page serveur affichera un autre état (annulé, passé, lien invalide) : on la recharge. */
const STALE_PAGE_ERRORS: readonly ActionErrorCode[] = [
  'INVALID_STATUS_TRANSITION',
  'APPOINTMENT_IN_PAST',
  'APPOINTMENT_NOT_FOUND',
];

/**
 * Annulation d'un rendez-vous par son client. L'action est irréversible (le créneau est libéré et peut
 * être repris aussitôt) : elle passe par une confirmation explicite, avec « conserver » comme issue sûre.
 */
export function CancelAppointmentPanel({ token, summary }: CancelAppointmentPanelProps) {
  const t = useTranslations('clientAppointment');
  const tCancel = useTranslations('clientAppointment.cancel');
  const errorMessage = useErrorMessage();
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<ActionErrorCode | null>(null);

  async function handleConfirm() {
    setPhase('submitting');
    setError(null);

    const result = await cancelAppointmentByTokenAction({ token });
    if (result.success) {
      setPhase('done');
      return;
    }

    setError(result.error);
    setPhase('idle');
    if (STALE_PAGE_ERRORS.includes(result.error)) router.refresh();
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <CheckCircle2 size={48} className="text-[var(--color-primary)]" />
        <h2 className="text-xl font-[var(--font-display)] font-bold">{tCancel('successTitle')}</h2>
        <p className="text-[var(--color-muted)]">{tCancel('successMessage')}</p>
        <Link href={getLocalizedPath('/rdv', locale)} className={`${LINK_BUTTON_CLASSES} mt-2`}>
          {t('bookAgain')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientAppointmentSummaryCard summary={summary} />

      {error && (
        <p role="alert" className="text-sm text-[var(--color-secondary)]">
          {errorMessage(error)}
        </p>
      )}

      {phase === 'idle' ? (
        <div className="space-y-4">
          <Button type="button" variant="secondary" onClick={() => setPhase('confirming')}>
            {tCancel('action')}
          </Button>
          <p className="text-sm text-[var(--color-muted)]">
            {tCancel('rescheduleHint')}{' '}
            <Link
              href={getLocalizedPath(`/rdv/modifier/${encodeURIComponent(token)}`, locale)}
              className="font-medium text-[var(--color-primary)] underline"
            >
              {tCancel('rescheduleAction')}
            </Link>
          </p>
        </div>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="cancel-confirm-title"
          aria-describedby="cancel-confirm-message"
          className="space-y-4 p-4 rounded-[var(--radius-md)] border border-[var(--color-border)]"
        >
          <h2 id="cancel-confirm-title" className="font-[var(--font-display)] font-bold">
            {tCancel('confirmTitle')}
          </h2>
          <p id="cancel-confirm-message" className="text-sm text-[var(--color-muted)]">
            {tCancel('confirmMessage')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" isLoading={phase === 'submitting'} onClick={handleConfirm}>
              {phase === 'submitting' ? tCancel('submitting') : tCancel('confirmAction')}
            </Button>
            <Button type="button" variant="outline" disabled={phase === 'submitting'} onClick={() => setPhase('idle')}>
              {tCancel('keep')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
