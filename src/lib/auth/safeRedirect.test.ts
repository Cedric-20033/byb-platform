// src/lib/auth/safeRedirect.test.ts
import { describe, expect, it } from 'vitest';
import { resolveSafeRedirect } from './safeRedirect';

const FALLBACK = '/fr/dashboard';

describe('resolveSafeRedirect', () => {
  it.each([null, undefined, ''])('retombe sur le dashboard quand la valeur est %j', (raw) => {
    expect(resolveSafeRedirect(raw, 'fr')).toBe(FALLBACK);
  });

  it('accepte un chemin du dashboard déjà localisé et conserve la query', () => {
    expect(resolveSafeRedirect('/fr/dashboard/appointments?status=pending', 'fr')).toBe(
      '/fr/dashboard/appointments?status=pending',
    );
  });

  it('ajoute la locale courante à un chemin non préfixé (cas du proxy)', () => {
    expect(resolveSafeRedirect('/dashboard/slots', 'fr')).toBe('/fr/dashboard/slots');
  });

  it('respecte la locale présente dans le chemin', () => {
    expect(resolveSafeRedirect('/de/dashboard/holidays', 'fr')).toBe('/de/dashboard/holidays');
  });

  it.each([
    'https://site-pirate.com',
    '//site-pirate.com/dashboard',
    '/\\site-pirate.com',
    '\\\\site-pirate.com',
    'javascript:alert(1)',
    '/fr/dashboard\r\nLocation: https://site-pirate.com',
    '/dashboard/%2e%2e/%2e%2e/etc',
  ])('rejette %j', (raw) => {
    const result = resolveSafeRedirect(raw, 'fr');

    expect(result.startsWith('/fr/dashboard')).toBe(true);
    expect(result).not.toContain('pirate');
  });

  it('rejette un chemin interne hors du dashboard', () => {
    expect(resolveSafeRedirect('/fr/services', 'fr')).toBe(FALLBACK);
    expect(resolveSafeRedirect('/login', 'fr')).toBe(FALLBACK);
  });

  it('neutralise la remontée de répertoire', () => {
    expect(resolveSafeRedirect('/fr/dashboard/../services', 'fr')).toBe(FALLBACK);
  });
});
