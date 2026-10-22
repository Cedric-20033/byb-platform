// src/application/catalog/realisations.test.ts
// Recomposition des médias des services pour l'accueil et la page /realisations.
import { describe, expect, it } from 'vitest';
import { buildService } from '@/test/fixtures/catalog';
import type { Service, ServiceVideo } from '@/types';
import { getHomeRealisationMedia } from './GetHomeRealisationMedia';
import { getRealisationsByService } from './GetRealisationsByService';

const video = (id: string): ServiceVideo => ({ id, publicId: `videos/${id}`, order: 0 });

const withMedia = (slug: string, coverImage: string, galleryImages: string[], videos: ServiceVideo[] = []): Service => ({
  ...buildService(slug),
  coverImage,
  galleryImages,
  videos,
});

describe('getHomeRealisationMedia', () => {
  it('ignore les services sans aucune photo', () => {
    expect(getHomeRealisationMedia([buildService('toiture')])).toEqual([]);
    expect(getHomeRealisationMedia([])).toEqual([]);
  });

  it('pioche aussi dans la photo de couverture, qui n\'est jamais dupliquée dans la galerie', () => {
    const items = getHomeRealisationMedia([withMedia('toiture', 'cover', [])]);

    expect(items.map((item) => item.publicId)).toEqual(['cover']);
  });

  it('plafonne à trois photos par service par défaut, sans doublon', () => {
    const items = getHomeRealisationMedia([withMedia('toiture', 'cover', ['g1', 'g2', 'g3', 'g4', 'g5'])]);

    expect(items).toHaveLength(3);
    expect(new Set(items.map((item) => item.publicId)).size).toBe(3);
    for (const item of items) expect(['cover', 'g1', 'g2', 'g3', 'g4', 'g5']).toContain(item.publicId);
  });

  it('accepte un quota différent par service', () => {
    const service = withMedia('toiture', 'cover', ['g1', 'g2', 'g3', 'g4', 'g5']);

    expect(getHomeRealisationMedia([service], 5)).toHaveLength(5);
    expect(getHomeRealisationMedia([service], 1)).toHaveLength(1);
  });

  it('renvoie toutes les photos quand le service en a moins que le quota', () => {
    const items = getHomeRealisationMedia([withMedia('toiture', 'cover', ['g1'])]);

    expect(items.map((item) => item.publicId).sort()).toEqual(['cover', 'g1']);
  });

  it('rattache chaque photo à son service', () => {
    const toiture = withMedia('toiture', 'toit-1', ['toit-2']);

    const items = getHomeRealisationMedia([toiture]);

    for (const item of items) {
      expect(item).toMatchObject({ serviceId: toiture.id, serviceSlug: 'toiture', serviceName: toiture.name });
    }
  });

  it('mélange plusieurs services en gardant le quota de chacun', () => {
    const toiture = withMedia('toiture', 'toit-0', ['toit-1', 'toit-2', 'toit-3']);
    const bardage = withMedia('bardage', 'bard-0', ['bard-1', 'bard-2', 'bard-3']);

    const items = getHomeRealisationMedia([toiture, bardage]);

    expect(items).toHaveLength(6);
    expect(items.filter((item) => item.serviceSlug === 'toiture')).toHaveLength(3);
    expect(items.filter((item) => item.serviceSlug === 'bardage')).toHaveLength(3);
  });

  it('est déterministe : le même catalogue donne toujours la même sélection (pas de scintillement au rafraîchissement)', () => {
    const services = [
      withMedia('toiture', 'toit-0', ['toit-1', 'toit-2', 'toit-3', 'toit-4']),
      withMedia('bardage', 'bard-0', ['bard-1', 'bard-2', 'bard-3', 'bard-4']),
    ];

    expect(getHomeRealisationMedia(services)).toEqual(getHomeRealisationMedia(services));
  });

  it('ne modifie pas les services reçus', () => {
    const service = withMedia('toiture', 'cover', ['g1', 'g2', 'g3', 'g4']);
    const snapshot = structuredClone(service);

    getHomeRealisationMedia([service]);

    expect(service).toEqual(snapshot);
  });
});

describe('getRealisationsByService', () => {
  it('place la couverture en tête, suivie de la galerie', () => {
    const [group] = getRealisationsByService([withMedia('toiture', 'cover', ['g1', 'g2'])]);

    expect(group.images).toEqual(['cover', 'g1', 'g2']);
  });

  it('se limite à la galerie quand le service n\'a pas de couverture', () => {
    const [group] = getRealisationsByService([withMedia('toiture', '', ['g1'])]);

    expect(group.images).toEqual(['g1']);
  });

  it('exclut les services sans photo ni vidéo', () => {
    const groups = getRealisationsByService([buildService('vide'), withMedia('toiture', 'cover', [])]);

    expect(groups.map((group) => group.serviceSlug)).toEqual(['toiture']);
  });

  it('conserve un service qui n\'a que des vidéos', () => {
    const [group] = getRealisationsByService([withMedia('bardage', '', [], [video('v1')])]);

    expect(group.images).toEqual([]);
    expect(group.videos).toEqual([video('v1')]);
  });

  it('garde l\'ordre du catalogue et expose l\'identité de chaque service', () => {
    const toiture = withMedia('toiture', 'a', []);
    const bardage = withMedia('bardage', 'b', []);

    const groups = getRealisationsByService([toiture, bardage]);

    expect(groups.map((group) => group.serviceSlug)).toEqual(['toiture', 'bardage']);
    expect(groups[0]).toMatchObject({ serviceId: toiture.id, serviceName: toiture.name });
  });

  it('renvoie une liste vide pour un catalogue vide', () => {
    expect(getRealisationsByService([])).toEqual([]);
  });
});
