// src/app/[locale]/(admin)/dashboard/page.tsx
import { getTranslations } from 'next-intl/server';
import { DashboardOverview } from '@/components/admin/DashboardOverview';

export default async function DashboardPage() {
  const t = await getTranslations('admin.dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('welcome')}</p>
      </div>

      <DashboardOverview />
    </div>
  );
}
