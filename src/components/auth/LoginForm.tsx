// src/components/auth/LoginForm.tsx
'use client';

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
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const loginSchema = z.object({
  email: z.email({ error: 'Adresse email invalide.' }),
  password: z.string().min(1, { error: 'Le mot de passe est requis.' }),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const tLogin = useTranslations('login');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    const result = await signInAction(values);

    if (!result.success) {
      setError('root', { message: result.error });
      toast.error(result.error);
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
