// src/lib/seo/alternates.test.ts
import { describe, expect, it } from 'vitest';
import { buildLocaleAlternates } from './alternates';

describe('buildLocaleAlternates', () => {
  it('déclare une alternative par langue et la page courante comme canonique', () => {
    expect(buildLocaleAlternates('/services/toiture', 'en')).toEqual({
      canonical: '/en/services/toiture',
      languages: {
        fr: '/fr/services/toiture',
        en: '/en/services/toiture',
        de: '/de/services/toiture',
        'x-default': '/fr/services/toiture',
      },
    });
  });

  it('gère la page d\'accueil', () => {
    const alternates = buildLocaleAlternates('/', 'de');
    expect(alternates.canonical).toBe('/de');
    expect(alternates.languages).toMatchObject({ fr: '/fr', 'x-default': '/fr' });
  });
});
