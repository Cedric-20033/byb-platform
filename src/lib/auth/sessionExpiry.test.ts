// src/lib/auth/sessionExpiry.test.ts
import { describe, expect, it } from 'vitest';
import { buildLoginRedirectUrl } from './sessionExpiry';

describe('buildLoginRedirectUrl', () => {
  it('conserve la locale et la page courantes', () => {
    expect(buildLoginRedirectUrl('/fr/dashboard/slots', '?date=2026-10-04')).toBe(
      '/fr/login?redirect=%2Ffr%2Fdashboard%2Fslots%3Fdate%3D2026-10-04',
    );
  });

  it("n'ajoute aucun préfixe quand le chemin n'en porte pas", () => {
    expect(buildLoginRedirectUrl('/dashboard', '')).toBe('/login?redirect=%2Fdashboard');
  });
});
