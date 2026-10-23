// src/domain/holiday/BelgianHolidays.ts
import { addDays } from '../shared/IsoDate';

/**
 * Jours fériés légaux belges : règles de calendrier pures, sans libellé.
 * Les noms affichés vivent dans les messages (`admin.holidays.belgian.<clé>`), pour être traduits.
 *
 * Placé dans le domaine (et non dans `src/data/`) : c'est une règle de calendrier légale, pas un
 * contenu éditorial, et le use case d'import qui la consomme ne peut dépendre que du domaine.
 */
export const BELGIAN_HOLIDAY_KEYS = [
  'newYear',
  'easterMonday',
  'labourDay',
  'ascension',
  'whitMonday',
  'nationalDay',
  'assumption',
  'allSaints',
  'armistice',
  'christmas',
] as const;

export type BelgianHolidayKey = (typeof BELGIAN_HOLIDAY_KEYS)[number];

export type BelgianHolidayRule = {
  key: BelgianHolidayKey;
  /** Date ISO « AAAA-MM-JJ » dans l'année demandée. */
  date: string;
  /**
   * Les fêtes à date fixe reviennent chaque année (récurrentes : une saisie suffit). Les fêtes mobiles
   * dépendent de Pâques : elles sont propres à l'année et doivent être importées chaque année.
   */
  recurring: boolean;
};

/** Fêtes à date fixe, au format « MM-JJ ». */
const FIXED_HOLIDAYS: ReadonlyArray<readonly [BelgianHolidayKey, string]> = [
  ['newYear', '01-01'],
  ['labourDay', '05-01'],
  ['nationalDay', '07-21'],
  ['assumption', '08-15'],
  ['allSaints', '11-01'],
  ['armistice', '11-11'],
  ['christmas', '12-25'],
];

/** Décalage en jours, depuis le dimanche de Pâques, des fêtes mobiles belges. */
const EASTER_OFFSETS: ReadonlyArray<readonly [BelgianHolidayKey, number]> = [
  ['easterMonday', 1],
  ['ascension', 39], // le jeudi, 39 jours après Pâques
  ['whitMonday', 50], // le lundi de Pentecôte, 50 jours après Pâques
];

/**
 * Dimanche de Pâques (calendrier grégorien) par l'algorithme de Meeus/Jones/Butcher.
 * Exact pour toutes les années grégoriennes ; aucune table à maintenir.
 */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Les dix jours fériés légaux belges d'une année, triés par date. */
export function getBelgianHolidays(year: number): BelgianHolidayRule[] {
  const easter = easterSunday(year);

  const fixed = FIXED_HOLIDAYS.map<BelgianHolidayRule>(([key, monthDay]) => ({
    key,
    date: `${year}-${monthDay}`,
    recurring: true,
  }));
  const movable = EASTER_OFFSETS.map<BelgianHolidayRule>(([key, offset]) => ({
    key,
    date: addDays(easter, offset),
    recurring: false,
  }));

  return [...fixed, ...movable].sort((a, b) => a.date.localeCompare(b.date));
}
