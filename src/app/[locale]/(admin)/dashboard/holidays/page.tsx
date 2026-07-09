// src/app/[locale]/(admin)/dashboard/holidays/page.tsx
import { getTranslations } from 'next-intl/server';
import { HolidaysManager } from '@/components/admin/HolidaysManager';

export default async function HolidaysPage() {
  const t = await getTranslations('admin.holidays');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <HolidaysManager />
    </div>
  );
}
