// src/app/[locale]/(admin)/dashboard/holidays/page.tsx
import { getTranslations } from 'next-intl/server';
import { HolidaysManager } from '@/components/admin/HolidaysManager';
import { requirePermission } from '@/lib/auth/requirePermission';
import { routing, type Locale } from '@/lib/routing';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';

interface HolidaysPageProps {
  // `string` ici (pas `Locale`) : c'est le type que Next.js génère pour ce segment dynamique.
  params: Promise<{ locale: string }>;
}

export default async function HolidaysPage({ params }: HolidaysPageProps) {
  await requirePermission('holidays', 'view');
  const { locale: rawLocale } = await params;
  const locale = (routing.locales.includes(rawLocale as Locale) ? rawLocale : routing.defaultLocale) as Locale;
  const t = await getTranslations('admin.holidays');

  const supabase = await createClient();
  // Les services servent à nommer les rendez-vous touchés par un congé (archivés inclus).
  const services = await new SupabaseServiceRepository(supabase).findAll();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <HolidaysManager locale={locale} services={services} />
    </div>
  );
}
