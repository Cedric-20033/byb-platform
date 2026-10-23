// src/components/auth/SetPasswordForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setPasswordAction } from '@/app/actions/password';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { setPasswordSchema, type SetPasswordValues } from '@/lib/validation/password';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from './FormField';

interface SetPasswordFormProps {
  /** `reset` : mot de passe oublié ; `invite` : premier mot de passe d'un compte invité. */
  mode: 'reset' | 'invite';
}

export function SetPasswordForm({ mode }: SetPasswordFormProps) {
  const t = useTranslations(mode === 'reset' ? 'auth.reset' : 'auth.invite');
  const tPassword = useTranslations('auth.setPassword');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({ resolver: zodResolver(setPasswordSchema) });

  async function onSubmit(values: SetPasswordValues) {
    const result = await setPasswordAction(values);

    if (!result.success) {
      const message = errorMessage(result.error);
      setError('root', { message });
      toast.error(message);
      return;
    }

    toast.success(t('success'));
    router.push(getLocalizedPath(ADMIN_ROUTES.DASHBOARD, locale));
    router.refresh();
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-[var(--font-display)] font-bold mb-1">{t('title')}</h1>
      <p className="text-sm text-[var(--color-muted)] mb-6">{t('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          label={tPassword('newPassword')}
          type="password"
          autoComplete="new-password"
          hint={tPassword('hint')}
          error={errors.password ? validationMessage(errors.password.message) : undefined}
          {...register('password')}
        />

        <FormField
          label={tPassword('confirmPassword')}
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword ? validationMessage(errors.confirmPassword.message) : undefined}
          {...register('confirmPassword')}
        />

        {errors.root && (
          <p role="alert" className="text-sm text-[var(--color-secondary)]">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2">
          {isSubmitting ? tPassword('submitting') : tPassword('submit')}
        </Button>
      </form>
    </Card>
  );
}
