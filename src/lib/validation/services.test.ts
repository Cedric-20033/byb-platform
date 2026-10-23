// src/lib/validation/services.test.ts
import { describe, expect, it } from 'vitest';
import {
  attachServiceMediaSchema,
  authorizeMediaUploadSchema,
  createServiceSchema,
  reorderServicesSchema,
} from './services';

const UUID = '00000000-0000-4000-8000-000000000001';
const UUID_2 = '00000000-0000-4000-8000-000000000002';

const validService = {
  name: { fr: 'Toiture' },
  shortDescription: { fr: 'Pose et rénovation.' },
  fullDescription: { fr: 'Description complète.' },
  icon: 'Hammer',
};

describe('createServiceSchema', () => {
  it('accepte un service dont seul le français est renseigné', () => {
    expect(createServiceSchema.safeParse(validService).success).toBe(true);
  });

  it('accepte EN/DE vides (le domaine les retire pour garder le repli sur le français)', () => {
    const input = { ...validService, name: { fr: 'Toiture', en: '', de: '' } };

    expect(createServiceSchema.safeParse(input).success).toBe(true);
  });

  it('exige le français avec la clé de message dédiée', () => {
    const result = createServiceSchema.safeParse({ ...validService, name: { fr: '  ', en: 'Roofing' } });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('frRequired');
  });

  it('accepte un slug vide (dérivé du nom) ou valide, refuse le reste', () => {
    expect(createServiceSchema.safeParse({ ...validService, slug: '' }).success).toBe(true);
    expect(createServiceSchema.safeParse({ ...validService, slug: 'toiture-plate' }).success).toBe(true);
    expect(createServiceSchema.safeParse({ ...validService, slug: 'Toiture Plate' }).success).toBe(false);
    expect(createServiceSchema.safeParse({ ...validService, slug: '../etc' }).success).toBe(false);
  });

  it('refuse un nom d\'icône qui n\'est pas du PascalCase', () => {
    expect(createServiceSchema.safeParse({ ...validService, icon: 'hammer' }).success).toBe(false);
    expect(createServiceSchema.safeParse({ ...validService, icon: '<script>' }).success).toBe(false);
  });

  it('refuse un texte trop long', () => {
    const input = { ...validService, name: { fr: 'x'.repeat(121) } };

    expect(createServiceSchema.safeParse(input).error?.issues[0].message).toBe('textTooLong');
  });
});

describe('reorderServicesSchema', () => {
  it('accepte une liste d\'identifiants distincts', () => {
    expect(reorderServicesSchema.safeParse({ orderedIds: [UUID, UUID_2] }).success).toBe(true);
  });

  it('refuse les doublons, la liste vide et les identifiants invalides', () => {
    expect(reorderServicesSchema.safeParse({ orderedIds: [UUID, UUID] }).success).toBe(false);
    expect(reorderServicesSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(reorderServicesSchema.safeParse({ orderedIds: ['pas-un-uuid'] }).success).toBe(false);
  });
});

describe('schémas de média', () => {
  it('refuse une taille négative, nulle ou démesurée', () => {
    const base = { serviceId: UUID, kind: 'image', mimeType: 'image/png' };

    expect(authorizeMediaUploadSchema.safeParse({ ...base, sizeBytes: 1024 }).success).toBe(true);
    expect(authorizeMediaUploadSchema.safeParse({ ...base, sizeBytes: 0 }).success).toBe(false);
    expect(authorizeMediaUploadSchema.safeParse({ ...base, sizeBytes: -5 }).success).toBe(false);
    expect(authorizeMediaUploadSchema.safeParse({ ...base, sizeBytes: 10 ** 12 }).success).toBe(false);
  });

  it('refuse un type de média inconnu', () => {
    const input = { serviceId: UUID, kind: 'audio', publicId: 'byb/services/x/a' };

    expect(attachServiceMediaSchema.safeParse(input).success).toBe(false);
  });
});
