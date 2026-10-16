// src/infrastructure/email/appointmentIcs.test.ts
import { describe, expect, it } from 'vitest';
import { buildIcs, type IcsEvent } from './appointmentIcs';

const event: IcsEvent = {
  uid: 'apt-1@byb-construction',
  summary: 'BYB : Toiture',
  date: '2026-10-20',
  startTime: '09:00:00',
  endTime: '10:30:00',
  stamp: new Date('2026-10-15T08:00:00Z'),
};

const lines = (ics: string) => ics.split('\r\n');

describe('buildIcs', () => {
  it('produit un calendrier valide avec un seul événement', () => {
    const ics = buildIcs(event);

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('VERSION:2.0');
  });

  it('termine chaque ligne par CRLF, comme l\'exige RFC 5545', () => {
    expect(buildIcs(event).replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('exprime début et fin en heure murale de Bruxelles', () => {
    const ics = buildIcs(event);

    expect(ics).toContain('DTSTART;TZID=Europe/Brussels:20261020T090000');
    expect(ics).toContain('DTEND;TZID=Europe/Brussels:20261020T103000');
  });

  it('embarque la définition du fuseau, que certains clients ne connaissent pas', () => {
    const ics = buildIcs(event);

    expect(ics).toContain('BEGIN:VTIMEZONE');
    expect(ics).toContain('TZID:Europe/Brussels');
    expect(ics).toContain('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU');
    expect(ics).toContain('RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU');
  });

  it('garde un identifiant stable et une révision croissante pour que l\'agenda mette l\'événement à jour', () => {
    const first = buildIcs(event);
    const later = buildIcs({ ...event, stamp: new Date('2026-10-16T08:00:00Z') });

    const sequence = (ics: string) => Number(/SEQUENCE:(\d+)/.exec(ics)![1]);
    expect(first).toContain('UID:apt-1@byb-construction');
    expect(later).toContain('UID:apt-1@byb-construction');
    expect(sequence(later)).toBeGreaterThan(sequence(first));
    expect(first).toContain('DTSTAMP:20261015T080000Z');
  });

  it('échappe les caractères qui ont un sens dans le format', () => {
    const ics = buildIcs({ ...event, summary: 'A, B; C\\D', description: 'ligne 1\nligne 2', location: 'Rue X, 3500 Asselt' });

    expect(ics).toContain('SUMMARY:A\\, B\\; C\\\\D');
    expect(ics).toContain('DESCRIPTION:ligne 1\\nligne 2');
    expect(ics).toContain('LOCATION:Rue X\\, 3500 Asselt');
  });

  it('omet les champs facultatifs absents', () => {
    const ics = buildIcs(event);

    expect(ics).not.toContain('DESCRIPTION');
    expect(ics).not.toContain('LOCATION');
  });

  it('replie les lignes de plus de 75 caractères', () => {
    const ics = buildIcs({ ...event, description: 'x'.repeat(200) });

    expect(lines(ics).every((line) => line.length <= 75)).toBe(true);
    // Les lignes de continuation commencent par une espace et se recollent sans perte.
    expect(ics.replace(/\r\n /g, '')).toContain(`DESCRIPTION:${'x'.repeat(200)}`);
  });
});
