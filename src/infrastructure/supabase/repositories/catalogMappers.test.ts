// src/infrastructure/supabase/repositories/catalogMappers.test.ts
import { describe, expect, it } from 'vitest';
import { toCatalogService, toI18nText, type ServiceAggregateRow } from './catalogMappers';

const baseRow: ServiceAggregateRow = {
  id: 's1',
  slug: 'toiture',
  name: { fr: 'Toiture', en: 'Roofing' },
  short_description: { fr: 'Courte' },
  full_description: { fr: 'Longue' },
  icon: 'Hammer',
  is_active: true,
  order: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  sub_services: [
    { id: 'b', service_id: 's1', slug: 'plate', name: { fr: 'Plate' }, description: { fr: 'd' }, order: 1, created_at: '' },
    { id: 'a', service_id: 's1', slug: 'pentue', name: { fr: 'Pentue' }, description: { fr: 'd' }, order: 0, created_at: '' },
  ],
  service_media: [
    { id: 'm2', service_id: 's1', type: 'video', public_id: 'v', is_cover: false, order: 1, created_at: '' },
    { id: 'm1', service_id: 's1', type: 'image', public_id: 'i', is_cover: true, order: 0, created_at: '' },
  ],
};

describe('toI18nText', () => {
  it('ne garde que les clés connues de type chaîne', () => {
    expect(toI18nText({ fr: 'Bonjour', en: 3, de: 'Hallo', es: 'Hola' })).toEqual({ fr: 'Bonjour', de: 'Hallo' });
  });

  it('une donnée corrompue donne un français vide plutôt qu\'une erreur', () => {
    expect(toI18nText(null)).toEqual({ fr: '' });
    expect(toI18nText(['fr'])).toEqual({ fr: '' });
  });
});

describe('toCatalogService', () => {
  it('trie sous-prestations et médias par ordre', () => {
    const service = toCatalogService(baseRow);

    expect(service.subServices.map((s) => s.id)).toEqual(['a', 'b']);
    expect(service.media.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('traduit les colonnes snake_case vers le modèle du domaine', () => {
    const service = toCatalogService(baseRow);

    expect(service).toMatchObject({ isActive: true, shortDescription: { fr: 'Courte' }, order: 2 });
    expect(service.media[0]).toMatchObject({ publicId: 'i', isCover: true, serviceId: 's1' });
  });

  it('tolère l\'absence de relations', () => {
    const service = toCatalogService({ ...baseRow, sub_services: null, service_media: null });

    expect(service.subServices).toEqual([]);
    expect(service.media).toEqual([]);
  });
});
