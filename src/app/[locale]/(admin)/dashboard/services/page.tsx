// src/app/[locale]/(admin)/dashboard/services/page.tsx
import { getTranslations } from 'next-intl/server';
import { ServicesManager } from '@/components/admin/services/ServicesManager';
import { requirePermission } from '@/lib/auth/requirePermission';

export default async function ServicesPage() {
  await requirePermission('services', 'view');
  const t = await getTranslations('admin.catalog');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <ServicesManager />
    </div>
  );
}
