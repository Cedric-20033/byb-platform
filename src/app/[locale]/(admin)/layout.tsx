// src/app/[locale]/(admin)/layout.tsx
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth/getCurrentAdmin';
import { getLocalizedPath, routing, type Locale } from '@/lib/routing';
import { AdminShell } from '@/components/admin/AdminShell';

interface AdminLayoutProps {
  children: React.ReactNode;
  // Next.js type ce segment dynamique comme `string` (voir .next/types/validator.ts) :
  // le narrowing vers `Locale` se fait nous-mêmes juste en dessous, pas via ce type.
  params: Promise<{ locale: string }>;
}

/**
 * Layout protégé admin — dernière ligne de défense côté serveur.
 * Le middleware fait déjà une vérification légère (cookie de session présent)
 * avant même de rendre cette page ; ici on résout le profil complet et on
 * s'assure qu'il porte bien un rôle admin/superadmin.
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale: rawLocale } = await params;
  const locale = (routing.locales.includes(rawLocale as Locale) ? rawLocale : routing.defaultLocale) as Locale;

  let admin;
  try {
    admin = await getCurrentAdmin();
  } catch {
    redirect(getLocalizedPath('/login', locale));
  }

  if (admin.role !== 'admin' && admin.role !== 'superadmin') {
    redirect(getLocalizedPath('/', locale));
  }

  return (
    <AdminShell fullName={admin.fullName} role={admin.role}>
      {children}
    </AdminShell>
  );
}
