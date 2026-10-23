// src/app/[locale]/(admin)/dashboard/testimonials/[id]/page.tsx
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { TestimonialEditor } from '@/components/admin/testimonials/TestimonialEditor';
import { requirePermission } from '@/lib/auth/requirePermission';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('testimonials', 'view');
  const { id } = await params;
  const t = await getTranslations('admin.testimonials.form');
  const locale = (await getLocale()) as Locale;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={getLocalizedPath(ADMIN_ROUTES.TESTIMONIALS, locale)}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          ← {t('backToList')}
        </Link>
        <h1 className="text-3xl font-[var(--font-display)] font-black mt-2">{t('editTitle')}</h1>
      </div>

      <TestimonialEditor testimonialId={id} />
    </div>
  );
}
