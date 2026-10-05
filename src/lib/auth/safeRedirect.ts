// src/lib/auth/safeRedirect.ts
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, routing, type Locale } from '@/lib/routing';

/** Origine fictive : sert uniquement à normaliser le chemin (`..`, `//`) via l'API URL. */
const PLACEHOLDER_ORIGIN = 'http://internal.invalid';

/**
 * Valide le paramètre `?redirect=` de la page de connexion.
 *
 * Sans validation, `?redirect=https://site-pirate.com` enverrait l'admin fraîchement
 * authentifié vers un site hostile (open redirect). On n'accepte donc qu'un chemin
 * interne situé sous /dashboard ; tout le reste retombe sur l'accueil du dashboard.
 */
export function resolveSafeRedirect(raw: string | null | undefined, locale: Locale): string {
  const fallback = getLocalizedPath(ADMIN_ROUTES.DASHBOARD, locale);

  // Refuse tout ce qui n'est pas un chemin absolu interne : URL complète, `//hote`
  // (protocole relatif), antislash (certains navigateurs le lisent comme `/`) et
  // caractères de contrôle.
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f]/.test(raw)) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

  const segments = url.pathname.split('/').filter(Boolean);
  const targetLocale = isLocale(segments[0]) ? segments.shift() : locale;

  if (segments[0] !== 'dashboard') return fallback;

  return getLocalizedPath(`/${segments.join('/')}`, targetLocale as Locale) + url.search;
}

function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (routing.locales as readonly string[]).includes(value);
}
