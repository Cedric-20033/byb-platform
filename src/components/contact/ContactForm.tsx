// src/components/contact/ContactForm.tsx
'use client';

import { useState, type ComponentProps } from 'react';
import { useForm, useWatch, type FieldError, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Send } from 'lucide-react';
import { submitContactMessageAction } from '@/app/actions/contact/submitContactMessage';
import { TurnstileWidget } from '@/components/booking/TurnstileWidget';
import { renderPrivacyLink } from '@/components/legal/privacyLink';
import { Button } from '@/components/ui/Button';
import { toAppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import type { ActionErrorCode } from '@/lib/errors';
import type { Locale } from '@/lib/routing';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { contactMessageSchema, type ContactMessageFormValues } from '@/lib/validation/contact';

/**
 * Clé publique Turnstile (inlinée au build). Absente : pas de widget, et le serveur, sans clé secrète,
 * n'exige pas de preuve : les deux variables vont ensemble.
 */
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const FIELD_CLASSES =
  'w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow';

/**
 * Formulaire de contact. Le schéma Zod est celui de la Server Action : mêmes règles des deux côtés,
 * messages traduits par `useValidationMessage()`. `noValidate` laisse ces messages remplacer les
 * bulles natives du navigateur, qui ne suivent pas la langue du site.
 */
export function ContactForm() {
  const t = useTranslations('contact.form');
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const locale = useLocale();

  const [submitError, setSubmitError] = useState<ActionErrorCode | null>(null);
  const [sent, setSent] = useState(false);
  // Un jeton Turnstile ne sert qu'une fois : le widget est remonté (nouvelle clé) après chaque refus.
  const [captchaAttempt, setCaptchaAttempt] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactMessageFormValues>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: { locale: toAppointmentLocale(locale) },
  });

  const captchaToken = useWatch({ control, name: 'captchaToken' });
  const isCaptchaPending = Boolean(TURNSTILE_SITE_KEY) && !captchaToken;

  async function onSubmit(values: ContactMessageFormValues) {
    setSubmitError(null);
    const result = await submitContactMessageAction(values);

    if (!result.success) {
      setSubmitError(result.error);
      setValue('captchaToken', undefined);
      setCaptchaAttempt((attempt) => attempt + 1);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div role="status" className="text-center py-10 space-y-4">
        <CheckCircle2 size={48} className="mx-auto text-green-500" aria-hidden="true" />
        <h2 className="font-[var(--font-display)] font-black text-2xl">{t('successTitle')}</h2>
        <p className="text-[var(--color-muted)]">{t('successMessage')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <input type="hidden" {...register('locale')} />

      {/*
        Piège à robots : hors écran, ignoré des lecteurs d'écran et du clavier. Un humain ne le remplit
        jamais ; un robot qui complète tous les champs, si.
      */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field
          id="contact-firstName"
          label={t('firstName')}
          required
          autoComplete="given-name"
          registration={register('firstName')}
          error={errors.firstName}
          translate={validationMessage}
        />
        <Field
          id="contact-lastName"
          label={t('lastName')}
          required
          autoComplete="family-name"
          registration={register('lastName')}
          error={errors.lastName}
          translate={validationMessage}
        />
      </div>

      <Field
        id="contact-email"
        label={t('email')}
        type="email"
        required
        autoComplete="email"
        registration={register('email')}
        error={errors.email}
        translate={validationMessage}
      />
      <Field
        id="contact-phone"
        label={t('phone')}
        type="tel"
        autoComplete="tel"
        registration={register('phone')}
        error={errors.phone}
        translate={validationMessage}
      />
      <Field
        id="contact-subject"
        label={t('subject')}
        required
        registration={register('subject')}
        error={errors.subject}
        translate={validationMessage}
      />
      <Field
        id="contact-message"
        label={t('message')}
        required
        multiline
        registration={register('message')}
        error={errors.message}
        translate={validationMessage}
      />

      {TURNSTILE_SITE_KEY && (
        <TurnstileWidget
          key={captchaAttempt}
          siteKey={TURNSTILE_SITE_KEY}
          onToken={(token) => setValue('captchaToken', token ?? undefined)}
          loadErrorMessage={t('captchaLoadError')}
        />
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage(submitError)}
        </p>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        {t.rich('privacyNotice', { link: renderPrivacyLink(locale as Locale) })}
      </p>

      <Button type="submit" isLoading={isSubmitting} disabled={isCaptchaPending} className="w-full">
        {isSubmitting ? t('sending') : t('submit')}
        {!isSubmitting && <Send size={16} aria-hidden="true" />}
      </Button>
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  translate: (message: string | undefined) => string;
  required?: boolean;
  multiline?: boolean;
} & Pick<ComponentProps<'input'>, 'type' | 'autoComplete'>;

/** Champ libellé, relié à son message d'erreur pour les lecteurs d'écran (`aria-invalid`, `aria-describedby`). */
function Field({ id, label, registration, error, translate, required, multiline, type = 'text', autoComplete }: FieldProps) {
  const errorId = `${id}-error`;
  const shared = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    'aria-required': required || undefined,
    className: FIELD_CLASSES,
    ...registration,
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-[var(--color-secondary)] ml-0.5" aria-hidden="true">*</span>}
      </label>
      {multiline ? (
        <textarea rows={5} {...shared} className={`${FIELD_CLASSES} resize-none`} />
      ) : (
        <input type={type} autoComplete={autoComplete} {...shared} />
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-500">
          {translate(error.message)}
        </p>
      )}
    </div>
  );
}
