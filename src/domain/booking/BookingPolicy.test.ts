// src/domain/booking/BookingPolicy.test.ts
import { describe, expect, it } from 'vitest';
import { assertSlotBookable, DEFAULT_BOOKING_POLICY, type BookingPolicy } from './BookingPolicy';

/** 15 octobre 2026, 10:00 à Bruxelles. */
const NOW = new Date('2026-10-15T10:00:00+02:00');
const POLICY: BookingPolicy = { minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 3 };

const check = (date: string, startTime: string) => () => assertSlotBookable({ date, startTime }, NOW, POLICY);

describe('assertSlotBookable', () => {
  it('accepte un créneau dans la fenêtre ouverte', () => {
    expect(check('2026-10-20', '09:00:00')).not.toThrow();
  });

  it('refuse un créneau déjà commencé', () => {
    expect(check('2026-10-15', '10:00')).toThrowError(expect.objectContaining({ code: 'SLOT_IN_PAST' }));
    expect(check('2026-10-14', '09:00')).toThrowError(expect.objectContaining({ code: 'SLOT_IN_PAST' }));
  });

  it('refuse un créneau plus proche que le délai minimal', () => {
    // 11:00 : une heure d'avance pour deux exigées.
    expect(check('2026-10-15', '11:00')).toThrowError(expect.objectContaining({ code: 'SLOT_TOO_SOON' }));
  });

  it('accepte un créneau exactement au délai minimal', () => {
    expect(check('2026-10-15', '12:00')).not.toThrow();
  });

  it('refuse un créneau au-delà de l\'horizon', () => {
    // 90 jours après le 15 octobre 2026 : le 13 janvier 2027.
    expect(check('2027-01-13', '09:00')).not.toThrow();
    expect(check('2027-01-14', '09:00')).toThrowError(expect.objectContaining({ code: 'SLOT_TOO_FAR' }));
  });

  it('applique la politique fournie, pas des valeurs figées', () => {
    const strict = { ...POLICY, minNoticeMinutes: 24 * 60 };

    expect(() => assertSlotBookable({ date: '2026-10-16', startTime: '09:00' }, NOW, strict)).toThrowError(
      expect.objectContaining({ code: 'SLOT_TOO_SOON' }),
    );
  });

  it('expose une politique par défaut raisonnable', () => {
    expect(DEFAULT_BOOKING_POLICY).toEqual({ minNoticeMinutes: 120, horizonDays: 90, maxUpcomingPerEmail: 3 });
  });
});
