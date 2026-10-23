// src/components/admin/services/matchesSearch.test.ts
import { describe, expect, it } from 'vitest';
import { matchesSearch } from './matchesSearch';

const service = { slug: 'toiture', name: { fr: 'Toiture', en: 'Roofing', de: 'Dachdeckerarbeiten' } };

describe('matchesSearch', () => {
  it('une recherche vide retient tout', () => {
    expect(matchesSearch(service, '   ')).toBe(true);
  });

  it('cherche dans les trois langues et dans le slug', () => {
    expect(matchesSearch(service, 'roof')).toBe(true);
    expect(matchesSearch(service, 'dachdecker')).toBe(true);
    expect(matchesSearch(service, 'toit')).toBe(true);
  });

  it('ignore la casse et les accents', () => {
    expect(matchesSearch({ slug: 'electricite', name: { fr: 'Électricité' } }, 'electricite')).toBe(true);
    expect(matchesSearch({ slug: 'x', name: { fr: 'Plomberie' } }, 'PLOMB')).toBe(true);
  });

  it('écarte ce qui ne correspond à rien', () => {
    expect(matchesSearch(service, 'carrelage')).toBe(false);
  });
});
