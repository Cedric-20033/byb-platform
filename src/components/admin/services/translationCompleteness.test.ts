// src/components/admin/services/translationCompleteness.test.ts
import { describe, expect, it } from 'vitest';
import { countCompleteLocales, isLocaleComplete } from './translationCompleteness';

const FIELDS = ['name', 'shortDescription'] as const;

describe('translationCompleteness', () => {
  it('une langue est complète quand tous les champs y sont renseignés', () => {
    const values = {
      name: { fr: 'Toiture', en: 'Roofing' },
      shortDescription: { fr: 'Pose', en: 'Installation' },
    };

    expect(isLocaleComplete(values, FIELDS, 'en')).toBe(true);
    expect(isLocaleComplete(values, FIELDS, 'de')).toBe(false);
  });

  it('un champ vide ou fait d\'espaces rend la langue incomplète', () => {
    const values = { name: { fr: 'Toiture', en: 'Roofing' }, shortDescription: { fr: 'Pose', en: '   ' } };

    expect(isLocaleComplete(values, FIELDS, 'en')).toBe(false);
  });

  it('compte le français parmi les langues complètes', () => {
    const values = {
      name: { fr: 'Toiture', en: 'Roofing', de: 'Dach' },
      shortDescription: { fr: 'Pose', en: 'Installation' },
    };

    expect(countCompleteLocales(values, FIELDS)).toBe(2);
  });
});
