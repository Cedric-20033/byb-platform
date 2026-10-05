// src/components/admin/ChangePasswordForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { changePasswordAction } from '@/app/actions/password';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/validation/password';
import { FormField } from '@/components/auth/FormField';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function ChangePasswordForm() {
  const t = useTranslations('auth.account');
  const tPassword = useTranslations('auth.setPassword');
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    const result = await changePasswordAction(values);

    if (!result.success) {
      const message = errorMessage(result.error);
      setError('root', { message });
      toast.error(message);
      return;
    }

    toast.success(t('success'));
    reset();
  }

  return (
    <Card className="max-w-md p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          label={t('currentPassword')}
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword ? validationMessage(errors.currentPassword.message) : undefined}
          {...register('currentPassword')}
        />

        <FormField
          label={tPassword('newPassword')}
          type="password"
          autoComplete="new-password"
          hint={tPassword('hint')}
          error={errors.newPassword ? validationMessage(errors.newPassword.message) : undefined}
          {...register('newPassword')}
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

        <Button type="submit" variant="primary" isLoading={isSubmitting} className="self-start">
          {t('submit')}
        </Button>
      </form>
    </Card>
  );
}
