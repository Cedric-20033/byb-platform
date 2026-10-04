// src/domain/shared/IsoDate.ts

/**
 * Arithmétique de dates calendaires "YYYY-MM-DD", indépendante du fuseau
 * horaire de la machine qui exécute le code.
 *
 * Pourquoi ce module : mélanger `new Date('YYYY-MM-DDT00:00:00')` (minuit LOCAL)
 * avec `toISOString()` (toujours UTC) décale la date d'un jour dès que le
 * fuseau est à l'est de UTC (Belgique : UTC+1/+2, Cameroun : UTC+1) — les
 * créneaux générés ou le "aujourd'hui" du dashboard tombent alors sur la veille.
 * Ici, toutes les opérations sur une date calendaire passent par UTC (sans
 * heure d'été, donc sans ambiguïté), et seul le passage instant → jour
 * calendaire dépend explicitement d'un fuseau nommé.
 */

/** Fuseau de référence de l'entreprise (Belgique). */
export const APP_TIME_ZONE = 'Europe/Brussels';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse une date ISO en minuit UTC ; rejette les formats invalides et les dates inexistantes (ex. 2026-02-31). */
function parse(isoDate: string): Date {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new Error(`Date ISO invalide : "${isoDate}" (format attendu : AAAA-MM-JJ).`);
  }
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC "déborde" silencieusement (31 février → 3 mars) : on le détecte.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Date ISO inexistante : "${isoDate}".`);
  }
  return date;
}

function format(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string): boolean {
  try {
    parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Jour calendaire d'un instant donné, vu depuis un fuseau précis.
 * Reste correct autour de minuit et des changements d'heure (été/hiver).
 */
export function toIsoDate(instant: Date, timeZone: string = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = parse(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return format(date);
}

/** 0 = dimanche … 6 = samedi (même convention que `Date.getDay()`). */
export function dayOfWeek(isoDate: string): number {
  return parse(isoDate).getUTCDay();
}

/** Lundi de la semaine ISO contenant `isoDate`. */
export function startOfIsoWeek(isoDate: string): string {
  const weekday = dayOfWeek(isoDate);
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDays(isoDate, offsetToMonday);
}

/** Toutes les dates de `from` à `to` incluses ; tableau vide si `from` > `to`. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let current = from; current <= to; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
}
