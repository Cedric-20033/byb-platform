// src/app/[locale]/(admin)/dashboard/account/page.tsx
import { getTranslations } from 'next-intl/server';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';

/**
 * « Mon compte » : ouvert à tout admin connecté, sans permission dédiée —
 * chacun gère la sécurité de son propre compte (le layout a déjà exigé un compte actif).
 */
export default async function AccountPage() {
  const t = await getTranslations('auth.account');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-[var(--font-display)] font-black">{t('title')}</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{t('subtitle')}</p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
