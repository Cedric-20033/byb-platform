// src/components/admin/SlotPicker.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getAvailableSlotsAction } from '@/app/actions/booking/getAvailableSlots';
import { cn } from '@/lib/utils';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';

type SlotPickerProps = {
  serviceId: string;
  /** Jour calendaire « AAAA-MM-JJ » dont on liste les créneaux libres. */
  date: string;
  /** Identifiant du créneau choisi, ou chaîne vide. */
  value: string;
  onChange: (slotId: string) => void;
};

/**
 * Créneaux libres d'un service pour un jour donné.
 * Réutilise la lecture publique (jours fériés déjà exclus) : l'admin voit exactement ce que verrait un visiteur.
 */
export function SlotPicker({ serviceId, date, value, onChange }: SlotPickerProps) {
  const t = useTranslations('admin.appointments.create');
  const errorMessage = useErrorMessage();

  // Clé sous ['admin', 'appointments'] : créer un rendez-vous invalide la liste, et le créneau réservé disparaît.
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['admin', 'appointments', 'availableSlots', serviceId, date],
    queryFn: async () => unwrapAction(await getAvailableSlotsAction({ serviceId, from: date, to: date })).slots,
    enabled: Boolean(serviceId && date),
  });

  if (isPending) return <p className="text-sm text-[var(--color-muted)]">{t('loadingSlots')}</p>;
  if (isError) return <p role="alert" className="text-sm text-[var(--color-secondary)]">{errorMessage(error)}</p>;
  if (data.length === 0) return <p className="text-sm text-[var(--color-muted)]">{t('noSlots')}</p>;

  return (
    <div role="group" aria-label={t('slotsLabel')} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {data.map((slot) => {
        const selected = slot.id === value;
        return (
          <button
            key={slot.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(slot.id)}
            className={cn(
              'px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-colors',
              selected
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]',
            )}
          >
            {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
          </button>
        );
      })}
    </div>
  );
}
