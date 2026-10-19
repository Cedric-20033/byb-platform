// src/app/[locale]/(admin)/dashboard/realisations/[id]/page.tsx
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { RealisationEditor } from '@/components/admin/realisations/RealisationEditor';
import { requirePermission } from '@/lib/auth/requirePermission';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

export default async function RealisationServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('services', 'view');
  const { id } = await params;
  const t = await getTranslations('admin.realisations');
  const locale = (await getLocale()) as Locale;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={getLocalizedPath(ADMIN_ROUTES.REALISATIONS, locale)}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          ← {t('backToList')}
        </Link>
        <h1 className="text-3xl font-[var(--font-display)] font-black mt-2">{t('title')}</h1>
      </div>

      <RealisationEditor serviceId={id} />
    </div>
  );
}
