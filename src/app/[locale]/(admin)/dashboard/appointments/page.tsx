// src/app/[locale]/(admin)/dashboard/appointments/page.tsx
import { getTranslations } from 'next-intl/server';
import { routing, type Locale } from '@/lib/routing';
import { AppointmentsManager } from '@/components/admin/AppointmentsManager';
import { parseOpenAppointmentId } from '@/components/admin/appointmentsUrlState';
import { requirePermission } from '@/lib/auth/requirePermission';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';

interface AppointmentsPageProps {
  // `string` ici (pas `Locale`) : c'est le type que Next.js génère pour ce segment dynamique.
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ open?: string }>;
}

export default async function AppointmentsPage({ params, searchParams }: AppointmentsPageProps) {
  await requirePermission('appointments', 'view');
  const { locale: rawLocale } = await params;
  const openId = parseOpenAppointmentId((await searchParams).open);
  const locale = (routing.locales.includes(rawLocale as Locale) ? rawLocale : routing.defaultLocale) as Locale;
  const t = await getTranslations('admin.appointments');

  const supabase = await createClient();
  // Services archivés inclus : leurs rendez-vous existent toujours et doivent afficher leur nom (et rester filtrables).
  // Un admin sans `services.view` ne reçoit que les services actifs (RLS) ; le tableau retombe alors sur l'identifiant.
  const services = await new SupabaseServiceRepository(supabase).findAll();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* `key` : un clic sur une notification, depuis cette même page, doit rouvrir la fiche demandée. */}
      <AppointmentsManager key={openId ?? 'list'} locale={locale} services={services} initialOpenId={openId} />
    </div>
  );
}
