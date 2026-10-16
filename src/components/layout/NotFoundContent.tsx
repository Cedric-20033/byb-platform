// src/components/layout/NotFoundContent.tsx
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { LINK_BUTTON_CLASSES } from '@/components/ui/linkButtonClasses';
import { cn } from '@/lib/utils';
import { getLocalizedPath, type Locale } from '@/lib/routing';

/**
 * Contenu de la page 404, dans la langue du visiteur (clés `errors.notFound*` et `errors.backHome`).
 * Partagé par la 404 du site public, qui s'affiche dans le chrome (navbar, footer, CTA), et par la 404 de
 * secours du segment `[locale]`, qui occupe tout l'écran.
 */
export function NotFoundContent({ fullScreen = false }: { fullScreen?: boolean }) {
  const t = useTranslations('errors');
  const locale = useLocale() as Locale;

  return (
    <div className={cn('flex items-center justify-center', fullScreen ? 'min-h-screen' : 'min-h-[70vh]')}>
      <div className="text-center space-y-6 px-4">
        <p aria-hidden="true" className="font-[var(--font-display)] font-black text-9xl text-[var(--color-primary)]/20">
          404
        </p>
        <h1 className="text-4xl font-[var(--font-display)] font-black">{t('notFound')}</h1>
        <p className="text-[var(--color-muted)] max-w-sm mx-auto">{t('notFoundDescription')}</p>
        <Link href={getLocalizedPath('/', locale)} className={LINK_BUTTON_CLASSES}>
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
