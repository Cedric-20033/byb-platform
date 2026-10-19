// src/app/[locale]/(admin)/dashboard/page.tsx
import { getTranslations } from 'next-intl/server';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { getCurrentAdmin } from '@/lib/auth/getCurrentAdmin';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';

export default async function DashboardPage() {
  const t = await getTranslations('admin.dashboard');
  const admin = await getCurrentAdmin();

  // Les widgets reposent sur les rendez-vous ou sur les créneaux : sans l'un de ces droits, rien à afficher.
  const canSeeAppointments = admin.can('appointments', 'view');
  const hasAnyWidget = canSeeAppointments || admin.can('slots', 'view');

  // Catalogue complet (services archivés inclus : leurs rendez-vous existent toujours et doivent afficher
  // leur nom). Inutile sans accès aux rendez-vous : seuls les widgets de rendez-vous nomment des services.
  const services = canSeeAppointments ? await new SupabaseServiceRepository(await createClient()).findAll() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('welcome')}</p>
      </div>

      {hasAnyWidget ? (
        <DashboardOverview services={services} />
      ) : (
        <p className="text-sm text-[var(--color-muted)]">{t('noStatsAccess')}</p>
      )}
    </div>
  );
}
