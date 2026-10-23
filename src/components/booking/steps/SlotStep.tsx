// src/components/booking/steps/SlotStep.tsx
'use client';

import { useTranslations } from 'next-intl';
import type { SlotDTO } from '@/app/actions/booking/getAvailableSlots';
import { useBookingStore } from '../useBookingStore';
import { SlotPicker } from '../SlotPicker';

/**
 * Étape 3 : sélection d'une date puis d'un créneau horaire.
 * La grille elle-même (et son rafraîchissement automatique) est dans `SlotPicker`,
 * partagée avec la page de modification d'un rendez-vous.
 */
export function SlotStep() {
  const tBooking = useTranslations('booking.slot');
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectSlot = useBookingStore((state) => state.selectSlot);
  const setStep = useBookingStore((state) => state.setStep);

  if (!selectedService) return null;

  function handleSelectSlot(slot: SlotDTO) {
    selectSlot(slot);
    setStep('confirmation');
  }

  return (
    <div>
      <h3 className="text-xl font-[var(--font-display)] font-bold mb-1">{tBooking('title')}</h3>
      <p className="text-sm text-[var(--color-muted)] mb-6">{tBooking('subtitle')}</p>

      <SlotPicker serviceId={selectedService.id} onSelect={handleSelectSlot} />
    </div>
  );
}
