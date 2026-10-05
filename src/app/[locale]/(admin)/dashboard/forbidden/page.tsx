// src/app/[locale]/(admin)/dashboard/forbidden/page.tsx
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { Card } from '@/components/ui/Card';

/**
 * Page 403 du dashboard. Volontairement sans garde de permission : c'est la
 * destination de tous les refus, elle doit rester accessible à tout admin connecté.
 */
export default async function ForbiddenPage() {
  const t = await getTranslations('admin.forbidden');
  const locale = (await getLocale()) as Locale;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 text-[var(--color-secondary)]" size={40} aria-hidden />
        <h1 className="text-2xl font-[var(--font-display)] font-black mb-2">{t('title')}</h1>
        <p className="text-sm text-[var(--color-muted)] mb-6">{t('description')}</p>
        <Link
          href={getLocalizedPath(ADMIN_ROUTES.DASHBOARD, locale)}
          className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]"
        >
          {t('back')}
        </Link>
      </Card>
    </div>
  );
}
