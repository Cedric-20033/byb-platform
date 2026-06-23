// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/lib/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Routes qui nécessitent une authentification admin.
 * Le middleware vérifie la présence d'un token Supabase valide.
 * Si absent, redirige vers la page de connexion.
 */
const PROTECTED_ROUTES = ['/dashboard'];

/**
 * Vérifie si le chemin demandé correspond à une route protégée.
 * Prend en compte le préfixe de locale (ex: /fr/dashboard, /en/dashboard).
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) =>
    // Matche /dashboard, /fr/dashboard, /en/dashboard, etc.
    pathname === route ||
    pathname.startsWith(`${route}/`) ||
    pathname.match(new RegExp(`^/(fr|en|de)${route}(/|$)`)) !== null
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Protection des routes admin ---
  if (isProtectedRoute(pathname)) {
    // Lecture du cookie de session Supabase
    // Note : la vérification complète JWT sera faite dans les layouts serveur
    const hasSession =
      request.cookies.has('sb-access-token') ||
      request.cookies.has('sb-refresh-token');

    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- Gestion i18n sur toutes les routes ---
  return intlMiddleware(request);
}

export const config = {
  // Applique le middleware à toutes les routes sauf les assets statiques
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};