// src/lib/date.ts
import { APP_TIME_ZONE, addDays, toIsoDate } from '@/domain/shared/IsoDate';

/**
 * Helpers de dates côté présentation (composants, server actions, scripts).
 * L'arithmétique pure vit dans le domaine (src/domain/shared/IsoDate.ts) ;
 * ce module n'ajoute que ce qui est lié à l'heure courante et à l'affichage.
 */
export { APP_TIME_ZONE } from '@/domain/shared/IsoDate';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Jour calendaire actuel en Belgique, quel que soit le fuseau du navigateur ou du serveur. */
export function todayInBrussels(now: Date = new Date()): string {
  return toIsoDate(now, APP_TIME_ZONE);
}

/** `count` jours consécutifs à partir d'aujourd'hui (heure belge), au format "YYYY-MM-DD". */
export function upcomingDates(count: number, now: Date = new Date()): string[] {
  const today = todayInBrussels(now);
  return Array.from({ length: count }, (_, index) => addDays(today, index));
}

/**
 * Affiche un jour calendaire "YYYY-MM-DD" selon la locale.
 *
 * Le jour est figé à minuit UTC et formaté en UTC : `new Date('2026-10-01')`
 * est déjà interprété en UTC, le formater dans le fuseau du navigateur
 * afficherait la veille pour tout fuseau situé à l'ouest de UTC.
 */
export function formatIsoDate(
  isoDate: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  if (!DATE_ONLY_PATTERN.test(isoDate)) {
    throw new Error(`Date ISO invalide : "${isoDate}" (format attendu : AAAA-MM-JJ).`);
  }
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Affiche un instant (ex. `createdAt`) dans le fuseau de l'entreprise. */
export function formatInstant(
  instant: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: APP_TIME_ZONE }).format(
    typeof instant === 'string' ? new Date(instant) : instant,
  );
}
