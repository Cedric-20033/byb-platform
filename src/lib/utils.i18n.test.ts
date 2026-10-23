// src/lib/utils.i18n.test.ts
import { describe, expect, it } from 'vitest';
import { t } from './utils';

describe('t() : repli sur le français', () => {
  const field = { fr: 'Toiture', en: 'Roofing', de: '   ' };

  it('renvoie la traduction demandée', () => {
    expect(t(field, 'en')).toBe('Roofing');
    expect(t(field, 'fr')).toBe('Toiture');
  });

  it('retombe sur le français quand la traduction est absente, vide ou blanche', () => {
    expect(t({ fr: 'Toiture' }, 'de')).toBe('Toiture');
    expect(t({ fr: 'Toiture', en: '' }, 'en')).toBe('Toiture');
    expect(t(field, 'de')).toBe('Toiture');
  });

  it('retombe sur le français pour une locale inconnue', () => {
    expect(t(field, 'zh')).toBe('Toiture');
  });
});
