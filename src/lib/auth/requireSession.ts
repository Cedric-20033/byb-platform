// src/lib/auth/requireSession.ts
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/infrastructure/supabase/server';
import { AUTH_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

/**
 * Garde des pages d'arrivée des liens email (réinitialisation, activation) :
 * elles ne servent qu'après que /auth/callback a ouvert une session. Ouvertes
 * directement, ou avec un lien périmé, elles renvoient vers la connexion.
 */
export async function requireSession(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return;

  const locale = (await getLocale()) as Locale;
  redirect(`${getLocalizedPath(AUTH_ROUTES.LOGIN, locale)}?error=invalidLink`);
}
