// src/domain/service/service.test.ts
import { describe, expect, it } from 'vitest';
import { DomainError } from '@/domain/shared/DomainError';
import { normalizeI18nText } from '@/domain/shared/I18nText';
import { assertValidSlug, isValidSlug, slugify } from '@/domain/shared/Slug';
import { assertInServiceFolder, assertUploadAllowed, MEDIA_LIMITS, serviceMediaFolder } from './MediaRules';
import { assertSamePermutation, nextOrder } from './ServiceOrder';

const codeOf = (fn: () => void) => {
  try {
    fn();
  } catch (error) {
    return error instanceof DomainError ? error.code : 'OTHER';
  }
  return null;
};

describe('slugify / isValidSlug', () => {
  it.each([
    ['Toiture Pentue', 'toiture-pentue'],
    ['  Électricité & Plomberie ! ', 'electricite-plomberie'],
    ['Panneaux solaires', 'panneaux-solaires'],
  ])('%s → %s', (input, expected) => expect(slugify(input)).toBe(expected));

  it.each(['toiture', 'toiture-pentue', 'a1-b2'])('accepte %s', (slug) => expect(isValidSlug(slug)).toBe(true));

  it.each(['', 'Toiture', '-toiture', 'toiture-', 'to--iture', 'toi ture', 'toiture/..', 'a'.repeat(81)])(
    'refuse %j',
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
      expect(codeOf(() => assertValidSlug(slug))).toBe('SLUG_INVALID');
    },
  );
});

describe('normalizeI18nText', () => {
  it('rogne, et retire les traductions vides', () => {
    expect(normalizeI18nText({ fr: '  Toiture ', en: '   ', de: ' Dach ' })).toEqual({ fr: 'Toiture', de: 'Dach' });
  });

  it.each([{}, { fr: '' }, { fr: '   ' }, { fr: null, en: 'Roof' }])('exige le français : %j', (input) => {
    expect(codeOf(() => normalizeI18nText(input))).toBe('TRANSLATION_FR_REQUIRED');
  });
});

describe('assertSamePermutation / nextOrder', () => {
  it('accepte toute permutation exacte', () => {
    expect(codeOf(() => assertSamePermutation(['a', 'b', 'c'], ['c', 'a', 'b'], 'SERVICE_ORDER_INVALID'))).toBeNull();
  });

  it.each([
    ['élément manquant', ['a', 'b']],
    ['élément inconnu', ['a', 'b', 'x']],
    ['doublon', ['a', 'a', 'b']],
    ['élément en trop', ['a', 'b', 'c', 'd']],
  ])('refuse : %s', (_label, proposed) => {
    expect(codeOf(() => assertSamePermutation(['a', 'b', 'c'], proposed, 'SERVICE_ORDER_INVALID'))).toBe(
      'SERVICE_ORDER_INVALID',
    );
  });

  it('nextOrder : 0 pour une liste vide, sinon max + 1', () => {
    expect(nextOrder([])).toBe(0);
    expect(nextOrder([{ order: 0 }, { order: 4 }, { order: 2 }])).toBe(5);
  });
});

describe('MediaRules', () => {
  it('accepte un fichier conforme', () => {
    expect(codeOf(() => assertUploadAllowed({ kind: 'image', mimeType: 'image/png', sizeBytes: 1024 }))).toBeNull();
  });

  it('applique les plafonds de CLAUDE.md : 10 Mo pour une image, 100 Mo pour une vidéo', () => {
    const image = MEDIA_LIMITS.image.maxBytes;
    const video = MEDIA_LIMITS.video.maxBytes;
    expect(image).toBe(10 * 1024 * 1024);
    expect(video).toBe(100 * 1024 * 1024);
    expect(codeOf(() => assertUploadAllowed({ kind: 'image', mimeType: 'image/png', sizeBytes: image }))).toBeNull();
    expect(codeOf(() => assertUploadAllowed({ kind: 'image', mimeType: 'image/png', sizeBytes: image + 1 }))).toBe(
      'MEDIA_TOO_LARGE',
    );
    expect(codeOf(() => assertUploadAllowed({ kind: 'video', mimeType: 'video/mp4', sizeBytes: video + 1 }))).toBe(
      'MEDIA_TOO_LARGE',
    );
  });

  it.each([
    ['image', 'image/svg+xml'],
    ['image', 'application/pdf'],
    ['image', 'video/mp4'],
    ['video', 'image/png'],
    ['video', 'video/x-msvideo'],
  ] as const)('refuse le type %s / %s', (kind, mimeType) => {
    expect(codeOf(() => assertUploadAllowed({ kind, mimeType, sizeBytes: 1024 }))).toBe('MEDIA_TYPE_NOT_ALLOWED');
  });

  it('refuse une taille nulle ou négative', () => {
    expect(codeOf(() => assertUploadAllowed({ kind: 'image', mimeType: 'image/png', sizeBytes: 0 }))).toBe('MEDIA_TOO_LARGE');
  });

  it('un média doit résider dans le dossier de son service', () => {
    expect(serviceMediaFolder('toiture')).toBe('byb/services/toiture');
    expect(codeOf(() => assertInServiceFolder('byb/services/toiture/photo-1', 'toiture'))).toBeNull();
    expect(codeOf(() => assertInServiceFolder('byb/services/isolation/photo-1', 'toiture'))).toBe('MEDIA_FOLDER_MISMATCH');
    // Préfixe commun mais dossier différent : « toiture-plate » n'est pas « toiture ».
    expect(codeOf(() => assertInServiceFolder('byb/services/toiture-plate/p', 'toiture'))).toBe('MEDIA_FOLDER_MISMATCH');
    expect(codeOf(() => assertInServiceFolder('byb/services/toiture/../isolation/p', 'toiture'))).toBe('MEDIA_FOLDER_MISMATCH');
    expect(codeOf(() => assertInServiceFolder('autre/dossier/p', 'toiture'))).toBe('MEDIA_FOLDER_MISMATCH');
  });
});
