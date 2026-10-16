// src/infrastructure/email/clientLinks.test.ts
import { describe, expect, it } from 'vitest';
import { buildBookUrl, buildClientLinks, resolveAppBaseUrl } from './clientLinks';

const TOKEN = '3f2b8c1e-5a4d-4e7b-9c3a-1d2e3f4a5b6c';

describe('resolveAppBaseUrl', () => {
  it('retire la barre finale', () => {
    expect(resolveAppBaseUrl({ NEXT_PUBLIC_APP_URL: 'https://byb.be/' })).toBe('https://byb.be');
    expect(resolveAppBaseUrl({ NEXT_PUBLIC_APP_URL: 'https://byb.be///' })).toBe('https://byb.be');
  });

  it('se replie sur le serveur local quand la variable est absente ou vide', () => {
    expect(resolveAppBaseUrl({})).toBe('http://localhost:3000');
    expect(resolveAppBaseUrl({ NEXT_PUBLIC_APP_URL: '  ' })).toBe('http://localhost:3000');
  });
});

describe('buildClientLinks', () => {
  it.each(['fr', 'en', 'de'] as const)('construit les liens du client en %s', (locale) => {
    expect(buildClientLinks('https://byb.be', locale, TOKEN)).toEqual({
      cancelUrl: `https://byb.be/${locale}/rdv/annuler/${TOKEN}`,
      rescheduleUrl: `https://byb.be/${locale}/rdv/modifier/${TOKEN}`,
    });
  });

  it('encode le jeton pour qu\'il ne puisse pas sortir du chemin', () => {
    const { cancelUrl } = buildClientLinks('https://byb.be', 'fr', '../x?y=1');

    expect(cancelUrl).toBe('https://byb.be/fr/rdv/annuler/..%2Fx%3Fy%3D1');
  });
});

describe('buildBookUrl', () => {
  it('pointe vers la page de réservation de la langue', () => {
    expect(buildBookUrl('https://byb.be', 'de')).toBe('https://byb.be/de/rdv');
  });
});
