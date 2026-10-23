// src/app/[locale]/(admin)/dashboard/settings/page.tsx
import { getTranslations } from 'next-intl/server';
import { SettingsEditor } from '@/components/admin/settings/SettingsEditor';
import { requirePermission } from '@/lib/auth/requirePermission';

export default async function SettingsPage() {
  await requirePermission('settings', 'view');
  const t = await getTranslations('admin.settings');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <SettingsEditor />
    </div>
  );
}
