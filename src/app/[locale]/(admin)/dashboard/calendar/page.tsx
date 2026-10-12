// src/app/[locale]/(admin)/dashboard/calendar/page.tsx
import { getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/lib/routing';
import { AppointmentsCalendar } from '@/components/admin/calendar/AppointmentsCalendar';
import { requirePermission } from '@/lib/auth/requirePermission';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';

interface CalendarPageProps {
  // `string` ici (pas `Locale`) : c'est le type que Next.js génère pour ce segment dynamique.
  params: Promise<{ locale: string }>;
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  await requirePermission('appointments', 'view');
  const { locale: rawLocale } = await params;
  const locale = (routing.locales.includes(rawLocale as Locale) ? rawLocale : routing.defaultLocale) as Locale;
  const t = await getTranslations('admin.calendar');

  const supabase = await createClient();
  // Services archivés inclus : leurs rendez-vous existent toujours et doivent afficher leur nom.
  const services = await new SupabaseServiceRepository(supabase).findAll();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <AppointmentsCalendar locale={locale} services={services} />
    </div>
  );
}
