// src/app/[locale]/(admin)/dashboard/slots/page.tsx
import { getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/lib/routing';
import { SlotsManager } from '@/components/admin/SlotsManager';
import { requirePermission } from '@/lib/auth/requirePermission';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';

interface SlotsPageProps {
  // `string` ici (pas `Locale`) : c'est le type que Next.js génère pour ce segment dynamique.
  params: Promise<{ locale: string }>;
}

export default async function SlotsPage({ params }: SlotsPageProps) {
  await requirePermission('slots', 'view');
  const { locale: rawLocale } = await params;
  const locale = (routing.locales.includes(rawLocale as Locale) ? rawLocale : routing.defaultLocale) as Locale;
  const t = await getTranslations('admin.slots');

  const supabase = await createClient();
  const services = await new SupabaseServiceRepository(supabase).findAll({ activeOnly: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <SlotsManager locale={locale} services={services} />
    </div>
  );
}
