// src/components/booking/SlotPicker.tsx
'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { SlotDTO } from '@/app/actions/booking/getAvailableSlots';
import { cn } from '@/lib/utils';
import { formatIsoDate, upcomingDates } from '@/lib/date';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useAvailableSlots } from './useAvailableSlots';

const DAYS_AHEAD = 14;

type SlotPickerProps = {
  serviceId: string;
  onSelect: (slot: SlotDTO) => void;
  /** Créneau à ne pas proposer : celui que le client occupe déjà quand il déplace son rendez-vous. */
  excludeSlotId?: string;
};

/**
 * Choix d'une date puis d'un créneau libre pour un service. Partagé par le wizard de réservation
 * et par la page de modification d'un rendez-vous : une seule grille, une seule règle d'affichage.
 * Les créneaux se mettent à jour d'eux-mêmes (voir `useAvailableSlots`).
 */
export function SlotPicker({ serviceId, onSelect, excludeSlotId }: SlotPickerProps) {
  const tSlot = useTranslations('booking.slot');
  const errorMessage = useErrorMessage();
  const locale = useLocale();

  // Jours calculés en heure belge : le premier jour proposé est toujours "aujourd'hui"
  // pour l'entreprise, quel que soit le fuseau du navigateur du visiteur.
  const dates = useMemo(() => upcomingDates(DAYS_AHEAD), []);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const { slots, isLoading, error } = useAvailableSlots(serviceId, selectedDate);

  const visibleSlots = excludeSlotId ? slots.filter((slot) => slot.id !== excludeSlotId) : slots;

  return (
    <div>
      {/* Sélecteur rapide de date : défilement horizontal sur mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {dates.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => setSelectedDate(date)}
            aria-pressed={date === selectedDate}
            className={cn(
              'shrink-0 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-colors',
              date === selectedDate
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]',
            )}
          >
            {formatIsoDate(date, locale, { weekday: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-[var(--color-muted)]">{tSlot('loading')}</p>}
      {error && <p className="text-sm text-[var(--color-secondary)]">{errorMessage(error)}</p>}
      {!isLoading && !error && visibleSlots.length === 0 && (
        <p className="text-sm text-[var(--color-muted)]">{tSlot('noSlots')}</p>
      )}

      {!isLoading && visibleSlots.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {visibleSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelect(slot)}
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
