// src/components/ui/LocaleSwitcher.tsx
'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { routing, type Locale } from '@/lib/routing';
import { switchLocalePath } from '@/lib/localePath';
import { cn } from '@/lib/utils';

/**
 * Sélecteur de langue du site public et du dashboard.
 * Conserve la page courante, ses paramètres de recherche et son ancre :
 * ils ne sont lus qu'au clic (window.location) pour ne pas rendre la page dynamique.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common.language');
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (target: Locale) => {
    if (target === current) return;
    const { search, hash } = window.location;
    startTransition(() => router.push(`${switchLocalePath(pathname, target)}${search}${hash}`));
  };

  return (
    <div role="group" aria-label={t('label')} className={cn('flex items-center gap-0.5', className)}>
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          disabled={isPending}
          aria-current={code === current ? 'true' : undefined}
          aria-label={t('switchTo', { language: t(code) })}
          title={t(code)}
          onClick={() => switchTo(code)}
          className={cn(
            'h-8 min-w-8 px-1.5 rounded-[var(--radius-md)] text-xs font-semibold uppercase transition-colors',
            code === current
              ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)]',
            'disabled:opacity-60',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
