// src/components/booking/steps/SubServiceStep.tsx
'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { Locale } from '@/lib/routing';
import { t } from '@/lib/utils';
import { useBookingStore } from '../useBookingStore';

/**
 * Étape 2 : choix de la sous-prestation (ex: "Toiture plate" vs "pentue").
 * N'est atteinte que si le service sélectionné possède des sous-services
 * (voir la logique de saut dans ServiceStep).
 */
export function SubServiceStep() {
  const tBooking = useTranslations('booking.subService');
  const locale = useLocale() as Locale;
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectSubService = useBookingStore((state) => state.selectSubService);
  const setStep = useBookingStore((state) => state.setStep);

  if (!selectedService) return null;

  function handleSelect(subServiceId: string | null) {
    const subService = selectedService!.subServices.find((s) => s.id === subServiceId) ?? null;
    selectSubService(subService);
    setStep('slot');
  }

  return (
    <div>
      <h3 className="text-xl font-[var(--font-display)] font-bold mb-1">{tBooking('title')}</h3>
      <p className="text-sm text-[var(--color-muted)] mb-6">{tBooking('subtitle')}</p>

      <div className="flex flex-col gap-3">
        {selectedService.subServices.map((subService) => (
          <button
            key={subService.id}
            type="button"
            onClick={() => handleSelect(subService.id)}
            className="text-left p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] transition-all duration-200"
          >
            <span className="font-medium block">{t(subService.name, locale)}</span>
            <span className="text-sm text-[var(--color-muted)]">{t(subService.description, locale)}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => handleSelect(null)}
          className="text-sm text-[var(--color-muted)] underline underline-offset-2 mt-2 self-start"
        >
          {tBooking('skip')}
        </button>
      </div>
    </div>
  );
}
