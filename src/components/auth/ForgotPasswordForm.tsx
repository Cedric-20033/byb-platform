// src/components/auth/ForgotPasswordForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { requestPasswordResetAction } from '@/app/actions/password';
import { AUTH_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { requestPasswordResetSchema } from '@/lib/validation/password';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from './FormField';

const emailSchema = requestPasswordResetSchema.pick({ email: true });
type ForgotPasswordValues = { email: string };

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgot');
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(emailSchema) });

  async function onSubmit({ email }: ForgotPasswordValues) {
    const result = await requestPasswordResetAction({ email, locale });

    if (!result.success) {
      toast.error(errorMessage(result.error));
      return;
    }
    setIsSent(true);
  }

  const backToLogin = (
    <Link
      href={getLocalizedPath(AUTH_ROUTES.LOGIN, locale)}
      className="text-center text-sm text-[var(--color-primary)] hover:underline"
    >
      {t('backToLogin')}
    </Link>
  );

  if (isSent) {
    return (
      <Card className="p-8 flex flex-col gap-4">
        <h1 className="text-xl font-[var(--font-display)] font-bold">{t('sentTitle')}</h1>
        <p role="status" className="text-sm text-[var(--color-muted)]">
          {t('sentMessage')}
        </p>
        {backToLogin}
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-[var(--font-display)] font-bold mb-1">{t('title')}</h1>
      <p className="text-sm text-[var(--color-muted)] mb-6">{t('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          label={t('email')}
          type="email"
          autoComplete="email"
          error={errors.email ? validationMessage(errors.email.message) : undefined}
          {...register('email')}
        />

        <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2">
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>

        {backToLogin}
      </form>
    </Card>
  );
}
