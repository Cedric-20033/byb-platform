// DEPRECATED (P6) : l'écran « Projets » est remplacé par /dashboard/realisations.
// Dossier `projects` à supprimer manuellement ; en attendant, la route redirige.
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

export default async function DeprecatedNewProjectPage() {
  redirect(getLocalizedPath(ADMIN_ROUTES.REALISATIONS, (await getLocale()) as Locale));
}
