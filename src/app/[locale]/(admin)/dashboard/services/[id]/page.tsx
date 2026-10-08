// src/app/[locale]/(admin)/dashboard/services/[id]/page.tsx
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ServiceEditor } from '@/components/admin/services/ServiceEditor';
import { requirePermission } from '@/lib/auth/requirePermission';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('services', 'view');
  const { id } = await params;
  const t = await getTranslations('admin.catalog.form');
  const locale = (await getLocale()) as Locale;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={getLocalizedPath(ADMIN_ROUTES.SERVICES, locale)}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          ← {t('backToList')}
        </Link>
        <h1 className="text-3xl font-[var(--font-display)] font-black mt-2">{t('editTitle')}</h1>
      </div>

      <ServiceEditor serviceId={id} />
    </div>
  );
}
