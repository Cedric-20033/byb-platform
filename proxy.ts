// proxy.ts
// Convention Next.js 16 : `middleware.ts` est déprécié et renommé `proxy.ts`.
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return intlMiddleware(request);
  }

  // @supabase/ssr ne pose jamais de cookies nommés "sb-access-token" /
  // "sb-refresh-token" (l'ancienne vérification ici ne matchait donc jamais
  // rien) — la seule façon fiable de savoir si la session est valide est de
  // demander à Supabase lui-même via getUser().
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session valide : on laisse next-intl gérer le préfixe de locale, en
  // propageant la réponse (et ses cookies éventuellement rafraîchis).
  const intlResponse = intlMiddleware(request);
  response.cookies.getAll().forEach((cookie) => intlResponse.cookies.set(cookie.name, cookie.value));
  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
