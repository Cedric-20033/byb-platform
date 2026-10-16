// src/domain/shared/IsoDate.wallClock.test.ts
import { describe, expect, it } from 'vitest';
import { wallClockToInstant } from './IsoDate';

const utc = (instant: Date) => instant.toISOString();

describe('wallClockToInstant', () => {
  it('applique UTC+1 en hiver', () => {
    expect(utc(wallClockToInstant('2026-01-15', '09:00'))).toBe('2026-01-15T08:00:00.000Z');
  });

  it('applique UTC+2 en été', () => {
    expect(utc(wallClockToInstant('2026-07-15', '09:00'))).toBe('2026-07-15T07:00:00.000Z');
  });

  it('reste juste le jour du passage à l\'heure d\'été (29 mars 2026)', () => {
    expect(utc(wallClockToInstant('2026-03-29', '01:30'))).toBe('2026-03-29T00:30:00.000Z');
    expect(utc(wallClockToInstant('2026-03-29', '09:00'))).toBe('2026-03-29T07:00:00.000Z');
  });

  it('reste juste le jour du retour à l\'heure d\'hiver (25 octobre 2026)', () => {
    expect(utc(wallClockToInstant('2026-10-25', '09:00'))).toBe('2026-10-25T08:00:00.000Z');
  });

  it('accepte le format HH:mm:ss de la base', () => {
    expect(utc(wallClockToInstant('2026-10-20', '09:30:00'))).toBe('2026-10-20T07:30:00.000Z');
  });

  it('interprète l\'heure dans le fuseau demandé', () => {
    expect(utc(wallClockToInstant('2026-01-15', '09:00', 'UTC'))).toBe('2026-01-15T09:00:00.000Z');
  });

  it('refuse une heure mal formée', () => {
    expect(() => wallClockToInstant('2026-10-20', '9h')).toThrow(/Heure invalide/);
    expect(() => wallClockToInstant('2026-10-20', '')).toThrow(/Heure invalide/);
  });
});
