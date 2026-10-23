// src/components/auth/LoginForm.tsx
'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import type { Locale } from '@/lib/routing';
import { getLocalizedPath } from '@/lib/routing';
import { AUTH_ROUTES } from '@/lib/constants';
import { resolveSafeRedirect } from '@/lib/auth/safeRedirect';
import { signInAction } from '@/app/actions/auth';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from './FormField';

type LoginValues = { email: string; password: string };

export function LoginForm() {
  const tLogin = useTranslations('login');
  const tAuth = useTranslations('auth');
  const errorMessage = useErrorMessage();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasInvalidLink = searchParams.get('error') === 'invalidLink';

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

  // Le lien de réinitialisation/invitation est invalide ou périmé : on l'explique une seule fois.
  useEffect(() => {
    if (hasInvalidLink) toast.error(tAuth('linkInvalid'));
  }, [hasInvalidLink, tAuth]);

  async function onSubmit(values: LoginValues) {
    const result = await signInAction(values);

    if (!result.success) {
      const message = errorMessage(result.error);
      setError('root', { message });
      toast.error(message);
      return;
    }

    // Le paramètre est contrôlé par l'URL : jamais utilisé tel quel (open redirect).
    router.push(resolveSafeRedirect(searchParams.get('redirect'), locale));
    router.refresh();
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-[var(--font-display)] font-bold mb-1">{tLogin('title')}</h1>
      <p className="text-sm text-[var(--color-muted)] mb-6">{tLogin('subtitle')}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          label={tLogin('email')}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <FormField
          label={tLogin('password')}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {errors.root && (
          <p role="alert" className="text-sm text-[var(--color-secondary)]">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2">
          {isSubmitting ? tLogin('submitting') : tLogin('submit')}
        </Button>

        <Link
          href={getLocalizedPath(AUTH_ROUTES.FORGOT_PASSWORD, locale)}
          className="text-center text-sm text-[var(--color-primary)] hover:underline"
        >
          {tAuth('forgotPassword')}
        </Link>
      </form>
    </Card>
  );
}
