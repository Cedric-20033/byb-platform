// src/app/[locale]/accept-invitation/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SetPasswordForm } from '@/components/auth/SetPasswordForm';
import { requireSession } from '@/lib/auth/requireSession';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.invite' });
  return { title: t('title'), robots: { index: false } };
}

export default async function AcceptInvitationPage() {
  await requireSession();

  return (
    <AuthLayout>
      <SetPasswordForm mode="invite" />
    </AuthLayout>
  );
}
