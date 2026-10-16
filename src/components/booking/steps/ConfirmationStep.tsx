// src/components/booking/steps/ConfirmationStep.tsx
'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations, useLocale } from 'next-intl';
import type { Locale } from '@/lib/routing';
import { renderPrivacyLink } from '@/components/legal/privacyLink';
import { t } from '@/lib/utils';
import { toAppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import { createAppointmentSchema, type CreateAppointmentFormValues } from '@/lib/validation/appointment';
import { createAppointmentAction } from '@/app/actions/booking/createAppointment';
import type { ActionErrorCode } from '@/lib/errors';
import { formatIsoDate } from '@/lib/date';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '../useBookingStore';
import { TurnstileWidget } from '../TurnstileWidget';

type ConfirmationStepProps = {
  onSuccess: () => void;
};

/**
 * Clé publique Turnstile (inlinée au build). Absente : pas de widget, et le serveur, sans clé secrète,
 * n'exige pas de preuve — les deux variables vont ensemble.
 */
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Erreurs qui signifient « ce créneau-là ne peut plus être pris » : la réponse est d'en choisir un autre. */
const SLOT_ERROR_CODES: readonly ActionErrorCode[] = [
  'SLOT_UNAVAILABLE',
  'SLOT_NOT_FOUND',
  'SLOT_TOO_SOON',
  'SLOT_TOO_FAR',
  'SLOT_IN_PAST',
];

/**
 * Étape 4 : coordonnées client + récapitulatif, puis soumission du RDV.
 * Le même schéma Zod (createAppointmentSchema) valide ici côté formulaire
 * ET côté Server Action — une seule source de vérité, jamais de duplication.
 */
export function ConfirmationStep({ onSuccess }: ConfirmationStepProps) {
  const tBooking = useTranslations('booking.confirmation');
  const tSummary = useTranslations('booking.summary');
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const locale = useLocale() as Locale;

  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSubService = useBookingStore((state) => state.selectedSubService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const setStep = useBookingStore((state) => state.setStep);

  const [submitError, setSubmitError] = useState<ActionErrorCode | null>(null);
  // Un jeton Turnstile ne sert qu'une fois : le widget est remonté (nouvelle clé) après chaque refus.
  const [captchaAttempt, setCaptchaAttempt] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      slotId: selectedSlot?.id ?? '',
      serviceId: selectedService?.id ?? '',
      subServiceId: selectedSubService?.id,
      locale: toAppointmentLocale(locale),
    },
  });

  const captchaToken = useWatch({ control, name: 'captchaToken' });
  const isCaptchaPending = Boolean(TURNSTILE_SITE_KEY) && !captchaToken;

  if (!selectedService || !selectedSlot) return null;

  const slotIsGone = submitError !== null && SLOT_ERROR_CODES.includes(submitError);

  async function onSubmit(values: CreateAppointmentFormValues) {
    setSubmitError(null);
    const result = await createAppointmentAction(values);

    if (!result.success) {
      setSubmitError(result.error);
      setValue('captchaToken', undefined);
      setCaptchaAttempt((attempt) => attempt + 1);
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
        <dd className="font-medium">{formatIsoDate(selectedSlot.date, locale)}</dd>

        <dt className="text-[var(--color-muted)]">{tSummary('time')}</dt>
        <dd className="font-medium">{selectedSlot.startTime.slice(0, 5)}</dd>
      </dl>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Champs cachés : le formulaire visible ne redemande pas des données déjà choisies */}
        <input type="hidden" {...register('slotId')} />
        <input type="hidden" {...register('serviceId')} />
        <input type="hidden" {...register('locale')} />

        {/*
          Piège à robots : hors écran, ignoré des lecteurs d'écran et du clavier. Un humain ne le remplit
          jamais ; un robot qui complète tous les champs, si.
        */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">{tBooking('name')}</label>
          <input
            {...register('clientName')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          {errors.clientName && (
            <p className="text-xs text-[var(--color-secondary)] mt-1">{validationMessage(errors.clientName.message)}</p>
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
            <p className="text-xs text-[var(--color-secondary)] mt-1">{validationMessage(errors.clientEmail.message)}</p>
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
            <p className="text-xs text-[var(--color-secondary)] mt-1">{validationMessage(errors.clientPhone.message)}</p>
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

        {TURNSTILE_SITE_KEY && (
          <TurnstileWidget
            key={captchaAttempt}
            siteKey={TURNSTILE_SITE_KEY}
            onToken={(token) => setValue('captchaToken', token ?? undefined)}
            loadErrorMessage={tBooking('captchaLoadError')}
          />
        )}

        {submitError && (
          <p role="alert" className="text-sm text-[var(--color-secondary)]">
            {errorMessage(submitError)}
          </p>
        )}

        <p className="text-xs text-[var(--color-muted)]">
          {tBooking.rich('privacyNotice', { link: renderPrivacyLink(locale, { newTab: true }) })}
        </p>

        {slotIsGone ? (
          // Le créneau a été pris pendant la saisie : renvoyer sur la grille, qui se relit à l'ouverture.
          <Button type="button" variant="primary" size="md" onClick={() => setStep('slot')}>
            {tBooking('chooseAnotherSlot')}
          </Button>
        ) : (
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} disabled={isCaptchaPending}>
            {isSubmitting ? tBooking('submitting') : tBooking('submit')}
          </Button>
        )}
      </form>
    </div>
  );
}
