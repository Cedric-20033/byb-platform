// src/app/[locale]/(admin)/dashboard/testimonials/page.tsx
import { getTranslations } from 'next-intl/server';
import { TestimonialsManager } from '@/components/admin/testimonials/TestimonialsManager';
import { requirePermission } from '@/lib/auth/requirePermission';

export default async function TestimonialsPage() {
  await requirePermission('testimonials', 'view');
  const t = await getTranslations('admin.testimonials');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <TestimonialsManager />
    </div>
  );
}
