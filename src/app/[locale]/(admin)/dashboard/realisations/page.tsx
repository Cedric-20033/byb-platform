// src/app/[locale]/(admin)/dashboard/realisations/page.tsx
import { getTranslations } from 'next-intl/server';
import { RealisationsManager } from '@/components/admin/realisations/RealisationsManager';
import { requirePermission } from '@/lib/auth/requirePermission';

export default async function RealisationsPage() {
  // Les Réalisations sont les médias des services : mêmes droits que le module Services.
  await requirePermission('services', 'view');
  const t = await getTranslations('admin.realisations');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <RealisationsManager />
    </div>
  );
}
