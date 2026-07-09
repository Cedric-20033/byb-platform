// src/app/[locale]/(admin)/dashboard/slots/page.tsx
import { getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/lib/routing';
import { SlotsManager } from '@/components/admin/SlotsManager';

interface SlotsPageProps {
  // `string` ici (pas `Locale`) : c'est le type que Next.js génère pour ce segment dynamique.
  params: Promise<{ locale: string }>;
}

export default async function SlotsPage({ params }: SlotsPageProps) {
  const { locale: rawLocale } = await params;
  const locale = (routing.locales.includes(rawLocale as Locale) ? rawLocale : routing.defaultLocale) as Locale;
  const t = await getTranslations('admin.slots');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <SlotsManager locale={locale} />
    </div>
  );
}
