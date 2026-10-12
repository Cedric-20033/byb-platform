// src/lib/validation/holiday.test.ts
import { describe, expect, it } from 'vitest';
import {
  createHolidayRequestSchema,
  createHolidaySchema,
  holidayConflictResolutionSchema,
  importBelgianHolidaysSchema,
} from './appointment';

const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('createHolidaySchema', () => {
  const base = { date: '2026-08-03', label: 'Congés annuels' };

  it('accepte un jour unique, sans date de fin', () => {
    expect(createHolidaySchema.safeParse(base).success).toBe(true);
  });

  it('accepte une plage', () => {
    expect(createHolidaySchema.safeParse({ ...base, endDate: '2026-08-14' }).success).toBe(true);
  });

  it('accepte une plage d\'un seul jour (fin = début)', () => {
    expect(createHolidaySchema.safeParse({ ...base, endDate: '2026-08-03' }).success).toBe(true);
  });

  it('refuse une fin antérieure au début, avec un message traduisible', () => {
    const result = createHolidaySchema.safeParse({ ...base, endDate: '2026-08-01' });

    expect(messagesOf(result)).toContain('startDateAfterEnd');
  });

  it('accepte une plage annuelle dans la même année', () => {
    expect(createHolidaySchema.safeParse({ ...base, endDate: '2026-08-14', isRecurring: true }).success).toBe(true);
  });

  it('refuse une plage annuelle à cheval sur deux années', () => {
    const result = createHolidaySchema.safeParse({
      date: '2026-12-30',
      endDate: '2027-01-03',
      label: 'Fêtes de fin d\'année',
      isRecurring: true,
    });

    expect(result.success).toBe(false);
  });

  it('accepte une plage NON annuelle à cheval sur deux années', () => {
    const result = createHolidaySchema.safeParse({ date: '2026-12-30', endDate: '2027-01-03', label: 'Fêtes' });

    expect(result.success).toBe(true);
  });

  it('refuse une date qui n\'existe pas', () => {
    expect(createHolidaySchema.safeParse({ ...base, endDate: '2026-02-31' }).success).toBe(false);
  });
});

describe('holidayConflictResolutionSchema', () => {
  it('accepte « ignorer » et « annuler » avec ou sans message', () => {
    expect(holidayConflictResolutionSchema.safeParse({ mode: 'ignore' }).success).toBe(true);
    expect(holidayConflictResolutionSchema.safeParse({ mode: 'cancel' }).success).toBe(true);
    expect(holidayConflictResolutionSchema.safeParse({ mode: 'cancel', reason: 'Fermé' }).success).toBe(true);
  });

  it('refuse un mode inconnu et un message démesuré', () => {
    expect(holidayConflictResolutionSchema.safeParse({ mode: 'delete' }).success).toBe(false);
    expect(holidayConflictResolutionSchema.safeParse({ mode: 'cancel', reason: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('createHolidayRequestSchema', () => {
  it('enveloppe le congé et la résolution facultative', () => {
    const result = createHolidayRequestSchema.safeParse({
      holiday: { date: '2026-08-03', label: 'Congés' },
      resolution: { mode: 'ignore' },
    });

    expect(result.success).toBe(true);
  });

  it('refuse un congé invalide à l\'intérieur de l\'enveloppe', () => {
    expect(createHolidayRequestSchema.safeParse({ holiday: { date: 'demain', label: 'Congés' } }).success).toBe(false);
  });
});

describe('importBelgianHolidaysSchema', () => {
  it('accepte une année plausible', () => {
    expect(importBelgianHolidaysSchema.safeParse({ year: 2027, locale: 'fr' }).success).toBe(true);
  });

  it.each([1999, 2101, 2026.5])('refuse l\'année %s', (year) => {
    expect(importBelgianHolidaysSchema.safeParse({ year, locale: 'fr' }).success).toBe(false);
  });
});
