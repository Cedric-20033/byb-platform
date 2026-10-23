// src/app/[locale]/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/infrastructure/supabase/server';
import { AUTH_ROUTES } from '@/lib/constants';
import { getLocalizedPath, routing, type Locale } from '@/lib/routing';

const purposeSchema = z.enum(['reset', 'invite']);

/**
 * La page d'arrivée et le type de jeton sont déduits d'une liste fermée, jamais
 * d'une URL fournie dans la requête : ce point d'entrée ne peut donc pas servir
 * de redirection ouverte.
 */
const DESTINATIONS = { reset: AUTH_ROUTES.RESET_PASSWORD, invite: AUTH_ROUTES.ACCEPT_INVITATION } as const;
const OTP_TYPES = { reset: 'recovery', invite: 'invite' } as const;

/**
 * Point d'arrivée des liens reçus par email (réinitialisation, invitation).
 *
 * Deux formes de lien coexistent :
 *  - `token_hash` : lien construit par nos gabarits d'email Supabase. Fonctionne
 *    quel que soit le navigateur qui l'ouvre — indispensable pour une invitation,
 *    envoyée par le serveur et donc sans « code verifier » PKCE côté navigateur.
 *  - `code` : lien PKCE standard, valable seulement dans le navigateur qui a
 *    demandé la réinitialisation.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = (routing.locales as readonly string[]).includes(rawLocale) ? (rawLocale as Locale) : routing.defaultLocale;

  // Base fixée par configuration : derrière un reverse proxy, `request.url` peut porter un hôte interne.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const invalidLink = NextResponse.redirect(new URL(`${getLocalizedPath(AUTH_ROUTES.LOGIN, locale)}?error=invalidLink`, origin));

  const purpose = purposeSchema.safeParse(request.nextUrl.searchParams.get('purpose'));
  if (!purpose.success) return invalidLink;

  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const code = request.nextUrl.searchParams.get('code');

  const supabase = await createClient();
  let error: unknown = new Error('Lien incomplet');

  if (tokenHash) {
    ({ error } = await supabase.auth.verifyOtp({ type: OTP_TYPES[purpose.data], token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  }

  if (error) return invalidLink;

  return NextResponse.redirect(new URL(getLocalizedPath(DESTINATIONS[purpose.data], locale), origin));
}
