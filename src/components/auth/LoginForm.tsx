// src/components/auth/LoginForm.tsx
'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { Locale } from '@/lib/routing';
import { getLocalizedPath } from '@/lib/routing';
import { ADMIN_ROUTES } from '@/lib/constants';
import { signInAction } from '@/app/actions/auth';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type LoginValues = { email: string; password: string };

export function LoginForm() {
  const tLogin = useTranslations('login');
  const errorMessage = useErrorMessage();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Schéma construit dans le composant : les messages de validation suivent la langue active.
  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.email({ error: tLogin('emailInvalid') }),
        password: z.string().min(1, { error: tLogin('passwordRequired') }),
      }),
    [tLogin],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    const result = await signInAction(values);

    if (!result.success) {
      const message = errorMessage(result.error);
      setError('root', { message });
      toast.error(message);
      return;
    }

    const redirectTo = searchParams.get('redirect') ?? getLocalizedPath(ADMIN_ROUTES.DASHBOARD, locale);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-[var(--font-display)] font-bold mb-1">{tLogin('title')}</h1>
      <p className="text-sm text-[var(--color-muted)] mb-6">{tLogin('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">{tLogin('email')}</label>
          <input
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          {errors.email && <p className="text-xs text-[var(--color-secondary)] mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">{tLogin('password')}</label>
          <input
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          {errors.password && (
            <p className="text-xs text-[var(--color-secondary)] mt-1">{errors.password.message}</p>
          )}
        </div>

        {errors.root && <p className="text-sm text-[var(--color-secondary)]">{errors.root.message}</p>}

        <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2">
          {isSubmitting ? tLogin('submitting') : tLogin('submit')}
        </Button>
      </form>
    </Card>
  );
}
