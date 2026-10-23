// src/components/booking/BookingWizard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import type { Service, SubService } from '@/types';
import { cn } from '@/lib/utils';
import { useBookingStore, type BookingStep } from './useBookingStore';
import { ServiceStep } from './steps/ServiceStep';
import { SubServiceStep } from './steps/SubServiceStep';
import { SlotStep } from './steps/SlotStep';
import { ConfirmationStep } from './steps/ConfirmationStep';

type BookingWizardProps = {
  services: Service[];
  /** Service pré-choisi (voir BookingDialog, page /rdv) — saute l'étape 'service'. */
  initialService?: Service;
  /**
   * Sous-prestation pré-choisie (lien `/rdv?service=…&sub=…`). Suppose
   * `initialService` ; saute alors aussi l'étape 'subService'.
   */
  initialSubService?: SubService;
};

const STEP_ORDER: BookingStep[] = ['service', 'subService', 'slot', 'confirmation'];

/**
 * Orchestrateur du wizard de réservation.
 *
 * Ne contient aucune logique métier : il affiche l'étape courante du store
 * et un indicateur de progression. Chaque étape gère sa propre interaction ;
 * ce composant reste un simple aiguillage.
 */
export function BookingWizard({ services, initialService, initialSubService }: BookingWizardProps) {
  const tSteps = useTranslations('booking.steps');
  const step = useBookingStore((state) => state.step);
  const reset = useBookingStore((state) => state.reset);
  const selectService = useBookingStore((state) => state.selectService);
  const selectSubService = useBookingStore((state) => state.selectSubService);
  const setStep = useBookingStore((state) => state.setStep);
  const [isDone, setIsDone] = useState(false);

  // Repart d'un état propre si le composant est démonté puis remonté
  // (ex: fermeture puis réouverture du dialogue de réservation).
  useEffect(() => {
    return () => reset();
  }, [reset]);

  // Présélection depuis une fiche service ou un lien /rdv : on saute directement
  // à l'étape pertinente au premier rendu, plutôt que de faire recliquer
  // l'utilisateur sur un choix qu'il a déjà fait en arrivant ici.
  useEffect(() => {
    if (!initialService) return;

    // selectService remet la sous-prestation à null : il doit précéder selectSubService.
    selectService(initialService);

    if (initialSubService) {
      selectSubService(initialSubService);
      setStep('slot');
      return;
    }

    setStep(initialService.subServices.length > 0 ? 'subService' : 'slot');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isDone) {
    return <BookingSuccessScreen />;
  }

  return (
    <div>
      <StepIndicator currentStep={step} labels={tSteps} />

      <div className="mt-6">
        {step === 'service' && <ServiceStep services={services} />}
        {step === 'subService' && <SubServiceStep />}
        {step === 'slot' && <SlotStep />}
        {step === 'confirmation' && <ConfirmationStep onSuccess={() => setIsDone(true)} />}
      </div>
    </div>
  );
}

function StepIndicator({
  currentStep,
  labels,
}: {
  currentStep: BookingStep;
  labels: ReturnType<typeof useTranslations>;
}) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <ol className="flex items-center gap-2">
      {STEP_ORDER.map((s, index) => (
        <li key={s} className="flex items-center gap-2 flex-1">
          <span
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
              index <= currentIndex
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-raised)] text-[var(--color-muted)]',
            )}
          >
            {index + 1}
          </span>
          <span className="hidden sm:inline text-xs text-[var(--color-muted)] truncate">{labels(s)}</span>
          {index < STEP_ORDER.length - 1 && (
            <span
              className={cn(
                'h-px flex-1',
                index < currentIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function BookingSuccessScreen() {
  const tConfirmation = useTranslations('booking.confirmation');

  return (
    <div className="flex flex-col items-center text-center py-8">
      <CheckCircle2 size={48} className="text-[var(--color-primary)] mb-4" />
      <h3 className="text-xl font-[var(--font-display)] font-bold mb-2">
        {tConfirmation('successTitle')}
      </h3>
      <p className="text-sm text-[var(--color-muted)]">{tConfirmation('successMessage')}</p>
    </div>
  );
}
