// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/lib/routing';

const intlMiddleware = createMiddleware(routing);

/** Routes nécessitant une session admin active. */
const PROTECTED_PREFIXES = ['/dashboard'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`) ||
      pathname.match(new RegExp(`^/(fr|en|de)${prefix}(/|$)`)) !== null
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protection des routes admin
  if (isProtectedPath(pathname)) {
    const hasSession =
      request.cookies.has('sb-access-token') ||
      request.cookies.has('sb-refresh-token');

    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Déléguer tout le reste à next-intl (gère /en, /de, / → /fr)
  return intlMiddleware(request);
}

export const config = {
  // Applique le middleware à toutes les routes sauf assets statiques
  matcher: [
    // Inclut / et toutes les routes sans extension de fichier
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};