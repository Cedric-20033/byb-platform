// src/components/admin/realisations/realisationsSummary.ts
import type { CatalogMedia } from '@/domain/service/CatalogService';

export type MediaSummary = {
  photos: number;
  videos: number;
  /** public_id de la vignette : la couverture, à défaut la première image. `null` sans image. */
  thumbnailPublicId: string | null;
};

/**
 * Résume la galerie d'un service pour la liste des Réalisations. Une vidéo ne sert jamais de
 * vignette : la miniature d'une vidéo n'est pas garantie, une image l'est.
 */
export function summarizeMedia(media: readonly CatalogMedia[]): MediaSummary {
  const images = media.filter((item) => item.type === 'image').sort((a, b) => a.order - b.order);
  const thumbnail = images.find((item) => item.isCover) ?? images[0];

  return {
    photos: images.length,
    videos: media.length - images.length,
    thumbnailPublicId: thumbnail?.publicId ?? null,
  };
}
