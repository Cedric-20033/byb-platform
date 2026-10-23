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

/**
 * Décalage (en ms) entre l'heure murale d'un fuseau et UTC à un instant donné
 * (+7 200 000 pour Bruxelles en été). Dérivé d'`Intl` : c'est la seule source
 * fiable des règles d'heure d'été, sans table maintenue à la main.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)!.value);
  const wallClockAsUtc = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second'));

  // `instant` est tronqué à la seconde pour que les millisecondes ne faussent pas la différence.
  return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Instant UTC de minuit (début de journée) d'un jour calendaire dans un fuseau donné.
 *
 * Sert à convertir un filtre « du 5 au 7 octobre » en bornes d'instants : minuit
 * à Bruxelles tombe à 22 h ou 23 h UTC la veille selon la saison, et jamais à 00 h UTC.
 * Deux passes suffisent : la première estime le décalage au minuit UTC, la seconde
 * le corrige si un changement d'heure survient entre l'estimation et le vrai minuit local.
 */
export function startOfDayInstant(isoDate: string, timeZone: string = APP_TIME_ZONE): Date {
  const utcMidnight = parse(isoDate).getTime();

  const firstGuess = utcMidnight - zoneOffsetMs(new Date(utcMidnight), timeZone);
  return new Date(utcMidnight - zoneOffsetMs(new Date(firstGuess), timeZone));
}

/**
 * Instant UTC correspondant à une heure murale (« 2026-10-20 à 09:00 ») dans un fuseau donné.
 * Même démarche en deux passes que `startOfDayInstant`, pour rester juste le jour d'un changement d'heure.
 * `time` accepte « HH:mm » ou « HH:mm:ss » (format renvoyé par la base).
 */
export function wallClockToInstant(isoDate: string, time: string, timeZone: string = APP_TIME_ZONE): Date {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) throw new Error(`Heure invalide : "${time}" (format attendu : HH:mm).`);

  const wallClockAsUtc = parse(isoDate).getTime() + (Number(match[1]) * 60 + Number(match[2])) * 60_000;

  const firstGuess = wallClockAsUtc - zoneOffsetMs(new Date(wallClockAsUtc), timeZone);
  return new Date(wallClockAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

/** Toutes les dates de `from` à `to` incluses ; tableau vide si `from` > `to`. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let current = from; current <= to; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
}
