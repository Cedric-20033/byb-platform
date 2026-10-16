// src/infrastructure/email/appointmentIcs.ts
import { APP_TIME_ZONE } from '@/domain/shared/IsoDate';

export type IcsEvent = {
  /** Identifiant stable : le même pour un rendez-vous déplacé, afin que l'agenda mette l'événement à jour. */
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  /** Jour de l'événement, « AAAA-MM-JJ », heure murale belge. */
  date: string;
  /** « HH:mm » ou « HH:mm:ss ». */
  startTime: string;
  endTime: string;
  /** Instant de génération ; sert aussi de numéro de révision (voir `SEQUENCE`). */
  stamp: Date;
};

/**
 * Définition du fuseau Europe/Brussels embarquée dans le fichier : sans elle, Outlook ignore le
 * `TZID` et décale l'événement. Règles européennes en vigueur depuis 1996 (dernier dimanche de mars et d'octobre).
 */
const VTIMEZONE_BRUSSELS = [
  'BEGIN:VTIMEZONE',
  `TZID:${APP_TIME_ZONE}`,
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
];

/** Échappement RFC 5545 : antislash, point-virgule, virgule et retours à la ligne ont un sens dans le format. */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Une ligne iCalendar ne dépasse pas 75 caractères : le reste continue sur une ligne commençant par un espace. */
function fold(line: string): string {
  const parts = [line.slice(0, 75)];
  for (let rest = line.slice(75); rest.length > 0; rest = rest.slice(74)) {
    parts.push(` ${rest.slice(0, 74)}`);
  }
  return parts.join('\r\n');
}

function localDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.slice(0, 5).replace(':', '')}00`;
}

function utcStamp(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Fichier .ics d'un événement unique, joint aux emails de confirmation et de déplacement. */
export function buildIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BYB Construction//Rendez-vous//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE_BRUSSELS,
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.stamp)}`,
    // Révision croissante : un fichier plus récent remplace l'événement déjà présent dans l'agenda.
    `SEQUENCE:${Math.floor(event.stamp.getTime() / 1000)}`,
    `DTSTART;TZID=${APP_TIME_ZONE}:${localDateTime(event.date, event.startTime)}`,
    `DTEND;TZID=${APP_TIME_ZONE}:${localDateTime(event.date, event.endTime)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.map(fold).join('\r\n')}\r\n`;
}
