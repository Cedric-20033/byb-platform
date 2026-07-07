// src/components/booking/steps/SlotStep.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getAvailableSlotsAction, type SlotDTO } from '@/app/actions/booking/getAvailableSlots';
import { useBookingStore } from '../useBookingStore';
import { cn } from '@/lib/utils';

const DAYS_AHEAD = 14;

/** Génère les 14 prochains jours au format ISO "YYYY-MM-DD" pour le sélecteur rapide. */
function buildUpcomingDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

/**
 * Étape 3 : sélection d'une date puis d'un créneau horaire.
 *
 * Pas de TanStack Query ici (pas encore de QueryClientProvider à la racine
 * du projet) — un simple effet + état local suffit pour ce besoin ponctuel.
 * À migrer vers useQuery si le provider est ajouté plus tard.
 */
export function SlotStep() {
  const tBooking = useTranslations('booking.slot');
  const locale = useLocale();
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const setStep = useBookingStore((state) => state.setStep);

  const upcomingDates = useMemo(() => buildUpcomingDates(DAYS_AHEAD), []);
  const [selectedDate, setSelectedDate] = useState(upcomingDates[0]);
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedService) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getAvailableSlotsAction({
      serviceId: selectedService.slug,
      from: selectedDate,
      to: selectedDate,
    }).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setSlots(result.slots);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    });

    // Évite d'appliquer le résultat d'une requête obsolète si l'utilisateur
    // change rapidement de date pendant le chargement.
    return () => {
      cancelled = true;
    };
  }, [selectedService, selectedDate]);

  if (!selectedService) return null;

  function handleSelectSlot(slot: SlotDTO) {
    selectSlot(slot);
    setStep('confirmation');
  }

  return (
    <div>
      <h3 className="text-xl font-[var(--font-display)] font-bold mb-1">{tBooking('title')}</h3>
      <p className="text-sm text-[var(--color-muted)] mb-6">{tBooking('subtitle')}</p>

      {/* Sélecteur rapide de date — défilement horizontal sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {upcomingDates.map((date) => {
          const label = new Date(date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-colors',
                date === selectedDate
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Grille des créneaux horaires disponibles pour la date choisie */}
      {isLoading && <p className="text-sm text-[var(--color-muted)]">{tBooking('loading')}</p>}
      {error && <p className="text-sm text-[var(--color-secondary)]">{error}</p>}
      {!isLoading && !error && slots.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">{tBooking('noSlots')}</p>
      )}

      {!isLoading && slots.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => handleSelectSlot(slot)}
              className="px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all duration-150"
            >
              {slot.startTime.slice(0, 5)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
