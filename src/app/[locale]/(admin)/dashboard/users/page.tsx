// src/app/[locale]/(admin)/dashboard/users/page.tsx
import { getTranslations } from 'next-intl/server';
import { UsersManager } from '@/components/admin/UsersManager';
import { requireSuperadmin } from '@/lib/auth/requirePermission';

export default async function UsersPage() {
  await requireSuperadmin();
  const t = await getTranslations('admin.users');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <UsersManager />
    </div>
  );
}
