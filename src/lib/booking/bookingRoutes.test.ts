// src/lib/booking/bookingRoutes.test.ts
import { describe, expect, it } from 'vitest';
import { isBookingPagePath } from './bookingRoutes';

describe('isBookingPagePath', () => {
  it.each(['/fr/rdv', '/en/rdv', '/de/rdv', '/fr/rdv/', '/rdv'])('reconnaît %s', (pathname) => {
    expect(isBookingPagePath(pathname)).toBe(true);
  });

  it.each([
    '/',
    '/fr',
    '/fr/services',
    '/fr/services/rdv',
    '/fr/rdv/annuler/abc',
    '/fr/rdv/modifier/abc',
    '/fr/dashboard/appointments',
    '/fr/rdvs',
    '/xx/rdv/extra',
  ])('rejette %s', (pathname) => {
    expect(isBookingPagePath(pathname)).toBe(false);
  });
});
