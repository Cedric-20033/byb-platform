// src/lib/localePath.ts
import { routing, type Locale } from '@/lib/routing';

/**
 * Chemin équivalent dans une autre langue : seul le préfixe de locale change,
 * le reste de l'URL (et donc la page courante) est conservé.
 * @example switchLocalePath('/fr/services/toiture', 'de') → '/de/services/toiture'
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/');
  const hasLocalePrefix = routing.locales.includes(segments[1] as Locale);

  if (hasLocalePrefix) {
    segments[1] = target;
    return segments.join('/');
  }
  return pathname === '/' ? `/${target}` : `/${target}${pathname}`;
}
