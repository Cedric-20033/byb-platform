// src/components/booking/steps/ConfirmationStep.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useLocale } from 'next-intl';
import type { Locale } from '@/lib/routing';
import { t } from '@/lib/utils';
import { createAppointmentSchema, type CreateAppointmentFormValues } from '@/lib/validation/appointment';
import { createAppointmentAction } from '@/app/actions/booking/createAppointment';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '../useBookingStore';

type ConfirmationStepProps = {
  onSuccess: () => void;
};

/**
 * Étape 4 : coordonnées client + récapitulatif, puis soumission du RDV.
 * Le même schéma Zod (createAppointmentSchema) valide ici côté formulaire
 * ET côté Server Action — une seule source de vérité, jamais de duplication.
 */
export function ConfirmationStep({ onSuccess }: ConfirmationStepProps) {
  const tBooking = useTranslations('booking.confirmation');
  const tSummary = useTranslations('booking.summary');
  const locale = useLocale() as Locale;

  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSubService = useBookingStore((state) => state.selectedSubService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      slotId: selectedSlot?.id ?? '',
      serviceId: selectedService?.slug ?? '',
      subServiceId: selectedSubService?.slug,
    },
  });

  if (!selectedService || !selectedSlot) return null;

  async function onSubmit(values: CreateAppointmentFormValues) {
    setSubmitError(null);
    const result = await createAppointmentAction(values);

    if (!result.success) {
      setSubmitError(result.error);
      return;
    }

    onSuccess();
  }

  return (
    <div>
      <h3 className="text-xl font-[var(--font-display)] font-bold mb-1">{tBooking('title')}</h3>
      <p className="text-sm text-[var(--color-muted)] mb-6">{tBooking('subtitle')}</p>

      {/* Récapitulatif — rassure l'utilisateur avant qu'il ne saisisse ses coordonnées */}
      <dl className="grid grid-cols-2 gap-y-1 text-sm mb-6 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]">
        <dt className="text-[var(--color-muted)]">{tSummary('service')}</dt>
        <dd className="font-medium">{t(selectedService.name, locale)}</dd>

        {selectedSubService && (
          <>
            <dt className="text-[var(--color-muted)]">{tSummary('subService')}</dt>
            <dd className="font-medium">{t(selectedSubService.name, locale)}</dd>
          </>
        )}

        <dt className="text-[var(--color-muted)]">{tSummary('date')}</dt>
        <dd className="font-medium">{new Date(selectedSlot.date).toLocaleDateString(locale)}</dd>

        <dt className="text-[var(--color-muted)]">{tSummary('time')}</dt>
        <dd className="font-medium">{selectedSlot.startTime.slice(0, 5)}</dd>
      </dl>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Champs cachés : le formulaire visible ne redemande pas des données déjà choisies */}
        <input type="hidden" {...register('slotId')} />
        <input type="hidden" {...register('serviceId')} />

        <div>
          <label className="text-sm font-medium block mb-1">{tBooking('name')}</label>
          <input
            {...register('clientName')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          {errors.clientName && (
            <p className="text-xs text-[var(--color-secondary)] mt-1">{errors.clientName.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">{tBooking('email')}</label>
          <input
            type="email"
            {...register('clientEmail')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          {errors.clientEmail && (
            <p className="text-xs text-[var(--color-secondary)] mt-1">{errors.clientEmail.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">{tBooking('phone')}</label>
          <input
            type="tel"
            {...register('clientPhone')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          {errors.clientPhone && (
            <p className="text-xs text-[var(--color-secondary)] mt-1">{errors.clientPhone.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">{tBooking('notes')}</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        </div>

        {submitError && <p className="text-sm text-[var(--color-secondary)]">{submitError}</p>}

        <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
          {isSubmitting ? tBooking('submitting') : tBooking('submit')}
        </Button>
      </form>
    </div>
  );
}
