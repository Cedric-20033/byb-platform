// src/lib/auth/sessionExpiry.ts
import { LOCALES } from '@/lib/constants';

/**
 * URL de connexion vers laquelle renvoyer un admin dont la session a expiré
 * pendant qu'il utilisait le dashboard : la locale et la page courantes sont
 * conservées, pour revenir exactement où il était après reconnexion.
 */
export function buildLoginRedirectUrl(pathname: string, search: string): string {
  const [, firstSegment] = pathname.split('/');
  const localePrefix = (LOCALES as readonly string[]).includes(firstSegment) ? `/${firstSegment}` : '';
  return `${localePrefix}/login?redirect=${encodeURIComponent(pathname + search)}`;
}
