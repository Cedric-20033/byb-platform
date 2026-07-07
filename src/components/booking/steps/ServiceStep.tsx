// src/components/booking/steps/ServiceStep.tsx
'use client';

import { useTranslations, useLocale } from 'next-intl';
import type { Service } from '@/types';
import type { Locale } from '@/lib/routing';
import { t } from '@/lib/utils';
import { useBookingStore } from '../useBookingStore';

type ServiceStepProps = {
  services: Service[];
};

/**
 * Étape 1 : choix du service (Toiture, Charpente, etc.).
 * `services` est reçu en prop depuis un Server Component — ce composant ne
 * touche jamais src/data/ directement (règle du projet).
 */
export function ServiceStep({ services }: ServiceStepProps) {
  const tBooking = useTranslations('booking.service');
  const locale = useLocale() as Locale;
  const selectService = useBookingStore((state) => state.selectService);
  const setStep = useBookingStore((state) => state.setStep);

  function handleSelect(service: Service) {
    selectService(service);
    // Une prestation ne comportant pas de sous-services, on saute directement
    // à l'étape du créneau — évite une étape vide et inutile pour l'utilisateur.
    setStep(service.subServices.length > 0 ? 'subService' : 'slot');
  }

  return (
    <div>
      <h3 className="text-xl font-[var(--font-display)] font-bold mb-1">{tBooking('title')}</h3>
      <p className="text-sm text-[var(--color-muted)] mb-6">{tBooking('subtitle')}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => handleSelect(service)}
            className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-sm)] transition-all duration-200 text-center"
          >
            <span className="text-sm font-medium">{t(service.name, locale)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
