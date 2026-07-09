// src/app/[locale]/login/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { company } from '@/data/company';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const tLogin = await getTranslations({ locale, namespace: 'login' });
  return { title: tLogin('title') };
}

/**
 * Page de connexion admin — volontairement hors des groupes (public)/(admin) :
 * ni navbar/footer publics, ni sidebar admin, juste un écran de connexion focalisé.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-[var(--font-display)] font-black text-2xl text-[var(--color-primary)]">
            {company.name}
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
