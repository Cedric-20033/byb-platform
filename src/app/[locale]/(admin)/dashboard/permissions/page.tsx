// src/app/[locale]/(admin)/dashboard/permissions/page.tsx
import { getTranslations } from 'next-intl/server';
import { PermissionsManager } from '@/components/admin/PermissionsManager';
import { requireSuperadmin } from '@/lib/auth/requirePermission';

export default async function PermissionsPage() {
  await requireSuperadmin();
  const t = await getTranslations('admin.permissions');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <PermissionsManager />
    </div>
  );
}
