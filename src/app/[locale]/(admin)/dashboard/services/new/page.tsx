// src/app/[locale]/(admin)/dashboard/services/new/page.tsx
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ServiceEditor } from '@/components/admin/services/ServiceEditor';
import { requirePermission } from '@/lib/auth/requirePermission';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

export default async function NewServicePage() {
  // `create` et non `view` : sans ce droit, le formulaire n'a aucun sens (le bouton est déjà masqué en liste).
  await requirePermission('services', 'create');
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
        <h1 className="text-3xl font-[var(--font-display)] font-black mt-2">{t('createTitle')}</h1>
      </div>

      <ServiceEditor />
    </div>
  );
}
