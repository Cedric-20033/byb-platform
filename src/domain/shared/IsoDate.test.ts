// src/domain/shared/IsoDate.test.ts
import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, eachDate, isValidIsoDate, startOfIsoWeek, toIsoDate } from './IsoDate';

describe('toIsoDate (jour calendaire belge)', () => {
  it.each([
    // Hiver (UTC+1) : 22h59 UTC = 23h59 à Bruxelles, 23h00 UTC = minuit.
    ['2026-01-15T22:59:00Z', '2026-01-15'],
    ['2026-01-15T23:00:00Z', '2026-01-16'],
    // Été (UTC+2) : 21h59 UTC = 23h59, 22h00 UTC = minuit.
    ['2026-06-30T21:59:00Z', '2026-06-30'],
    ['2026-06-30T22:30:00Z', '2026-07-01'],
    // Passage à l'heure d'été (dimanche 29 mars 2026, 01h00 UTC).
    ['2026-03-28T23:30:00Z', '2026-03-29'],
    ['2026-03-29T21:59:00Z', '2026-03-29'],
    ['2026-03-29T22:00:00Z', '2026-03-30'],
    // Retour à l'heure d'hiver (dimanche 25 octobre 2026, 01h00 UTC).
    ['2026-10-25T22:30:00Z', '2026-10-25'],
    ['2026-10-25T23:00:00Z', '2026-10-26'],
    // Changement d'année.
    ['2026-12-31T23:30:00Z', '2027-01-01'],
  ])('%s → %s', (instant, expected) => {
    expect(toIsoDate(new Date(instant))).toBe(expected);
  });
});

describe('addDays', () => {
  it('traverse les fins de mois et d\'année', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('gère les années bissextiles', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('n\'est pas affecté par les changements d\'heure', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
  });
});

describe('dayOfWeek', () => {
  it('suit la convention Date.getDay() (0 = dimanche)', () => {
    expect(dayOfWeek('2026-09-30')).toBe(3); // mercredi
    expect(dayOfWeek('2026-10-04')).toBe(0); // dimanche
    expect(dayOfWeek('2026-10-03')).toBe(6); // samedi
  });
});

describe('startOfIsoWeek', () => {
  it('renvoie le lundi de la semaine', () => {
    expect(startOfIsoWeek('2026-09-28')).toBe('2026-09-28'); // lundi
    expect(startOfIsoWeek('2026-09-30')).toBe('2026-09-28'); // mercredi
    expect(startOfIsoWeek('2026-10-04')).toBe('2026-09-28'); // dimanche → lundi précédent
  });

  it('traverse le changement d\'année', () => {
    expect(startOfIsoWeek('2027-01-01')).toBe('2026-12-28');
  });
});

describe('eachDate', () => {
  it('inclut les deux bornes, y compris à travers un changement d\'heure', () => {
    expect(eachDate('2026-03-28', '2026-03-30')).toEqual(['2026-03-28', '2026-03-29', '2026-03-30']);
  });

  it('renvoie un seul jour si from = to', () => {
    expect(eachDate('2026-10-01', '2026-10-01')).toEqual(['2026-10-01']);
  });

  it('renvoie un tableau vide si from > to', () => {
    expect(eachDate('2026-10-02', '2026-10-01')).toEqual([]);
  });
});

describe('validation', () => {
  it('rejette les formats invalides et les dates inexistantes', () => {
    expect(isValidIsoDate('2026-02-31')).toBe(false);
    expect(isValidIsoDate('2026-2-1')).toBe(false);
    expect(isValidIsoDate('2026-10-01T10:00:00')).toBe(false);
    expect(isValidIsoDate('2026-10-01')).toBe(true);
  });

  it('lève une erreur explicite sur une date invalide', () => {
    expect(() => addDays('2026-02-31', 1)).toThrow(/inexistante/);
  });
});
