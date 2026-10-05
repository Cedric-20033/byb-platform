// src/lib/auth/requirePermission.ts
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentAdmin, type CurrentAdmin } from '@/lib/auth/getCurrentAdmin';
import { ADMIN_ROUTES, type PermissionAction, type PermissionDomain } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

/** Page affichée à un admin connecté qui n'a pas le droit d'accéder à une page du dashboard. */
export const FORBIDDEN_ROUTE = `${ADMIN_ROUTES.DASHBOARD}/forbidden`;

/**
 * Garde de page (Server Component) : à appeler en tête de chaque page du
 * dashboard. Le masquage de la sidebar n'est qu'un confort — c'est cette
 * garde qui empêche l'accès par saisie directe de l'URL.
 *
 * `redirect()` lève une exception interne : il ne doit jamais être appelé
 * dans un bloc `try`, d'où la séparation entre la vérification et la redirection.
 */
export async function requirePermission(domain: PermissionDomain, action: PermissionAction): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin.can(domain, action)) await denyAccess();
  return admin;
}

/** Garde réservée au superadmin (pages Utilisateurs et Permissions). */
export async function requireSuperadmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin.isSuperadmin) await denyAccess();
  return admin;
}

async function denyAccess(): Promise<never> {
  const locale = (await getLocale()) as Locale;
  redirect(getLocalizedPath(FORBIDDEN_ROUTE, locale));
}
