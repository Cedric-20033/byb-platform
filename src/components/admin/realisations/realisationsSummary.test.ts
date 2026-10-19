// src/components/admin/realisations/realisationsSummary.test.ts
import { describe, expect, it } from 'vitest';
import type { CatalogMedia } from '@/domain/service/CatalogService';
import { summarizeMedia } from './realisationsSummary';

const media = (id: string, type: 'image' | 'video', order: number, isCover = false): CatalogMedia => ({
  id,
  serviceId: 'svc',
  type,
  publicId: `byb/services/toiture/${id}`,
  isCover,
  order,
});

describe('summarizeMedia', () => {
  it('compte les photos et les vidéos séparément', () => {
    const summary = summarizeMedia([media('a', 'image', 0), media('b', 'video', 1), media('c', 'image', 2)]);

    expect(summary.photos).toBe(2);
    expect(summary.videos).toBe(1);
  });

  it('prend la couverture comme vignette, même si elle n’est pas la première image', () => {
    const summary = summarizeMedia([media('a', 'image', 0), media('b', 'image', 1, true)]);

    expect(summary.thumbnailPublicId).toBe('byb/services/toiture/b');
  });

  it('à défaut de couverture, prend la première image dans l’ordre d’affichage', () => {
    const summary = summarizeMedia([media('b', 'image', 1), media('a', 'image', 0)]);

    expect(summary.thumbnailPublicId).toBe('byb/services/toiture/a');
  });

  it('n’utilise jamais une vidéo comme vignette', () => {
    expect(summarizeMedia([media('v', 'video', 0)]).thumbnailPublicId).toBeNull();
  });

  it('gère une galerie vide', () => {
    expect(summarizeMedia([])).toEqual({ photos: 0, videos: 0, thumbnailPublicId: null });
  });

  it('ne modifie pas le tableau reçu', () => {
    const input = [media('b', 'image', 1), media('a', 'image', 0)];

    summarizeMedia(input);

    expect(input.map((item) => item.id)).toEqual(['b', 'a']);
  });
});
