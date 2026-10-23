// src/components/sections/RealisationsExplorer.tsx
'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { PlayCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { t, getImageUrl, getVideoUrl, getVideoThumbnailUrl } from '@/lib/utils';
import type { Locale } from '@/lib/routing';
import type { RealisationServiceGroup } from '@/application/catalog/GetRealisationsByService';
import { RealisationLightbox } from './RealisationLightbox';
import { RealisationsInfiniteModal } from './RealisationsInfiniteModal';

/** Vignettes affichées directement sur la page avant le bouton "Voir plus". */
const INITIAL_PHOTO_LIMIT = 9;
const INITIAL_VIDEO_LIMIT = 6;

type RealisationsExplorerProps = {
  groups: RealisationServiceGroup[];
};

/**
 * Page /realisations : une section par service, photos et vidéos JAMAIS
 * mélangées dans la même grille (contrairement à ServiceMediaGallery qui les
 * bascule via des onglets — ici le client veut les deux visibles côte à côte).
 *
 * Chaque section n'affiche qu'un premier lot de vignettes ; le bouton
 * "Voir plus" ouvre une modale à scroll infini (RealisationsInfiniteModal)
 * qui charge le reste progressivement. Ni la page ni la modale ne connaissent
 * de titre/description par photo : la légende est toujours le nom du service,
 * seule métadonnée réellement disponible (cf. service_media).
 */
export function RealisationsExplorer({ groups }: RealisationsExplorerProps) {
  return (
    <div className="space-y-16">
      {groups.map((group) => (
        <RealisationServiceBlock key={group.serviceId} group={group} />
      ))}
    </div>
  );
}

function RealisationServiceBlock({ group }: { group: RealisationServiceGroup }) {
  const tReal = useTranslations('realisations');
  const locale = useLocale() as Locale;
  const serviceName = t(group.serviceName, locale);

  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Slides construits sur la collection COMPLÈTE : la lightbox doit pouvoir
  // naviguer au-delà des vignettes visibles sur la page (même logique que
  // ServiceMediaGallery), que l'ouverture vienne de la grille ou de la modale.
  const photoSlides = useMemo(
    () => group.images.map((img) => ({ src: getImageUrl(img, { width: 1600 }) })),
    [group.images],
  );
  const videoSlides = useMemo(
    () =>
      group.videos.map((video) => ({
        type: 'video' as const,
        sources: [{ src: getVideoUrl(video.publicId), type: 'video/mp4' }],
        poster: getVideoThumbnailUrl(video.publicId),
      })),
    [group.videos],
  );

  const hasMorePhotos = group.images.length > INITIAL_PHOTO_LIMIT;
  const hasMoreVideos = group.videos.length > INITIAL_VIDEO_LIMIT;

  return (
    <section>
      <h2 className="mb-5 font-[var(--font-display)] text-2xl font-black">{serviceName}</h2>

      {group.images.length > 0 && (
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {group.images.slice(0, INITIAL_PHOTO_LIMIT).map((img, i) => (
              <button
                key={img}
                type="button"
                onClick={() => setPhotoIndex(i)}
                className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]"
              >
                <Image
                  src={getImageUrl(img, { width: 500, height: 375 })}
                  alt={`${serviceName} ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </button>
            ))}
          </div>

          {hasMorePhotos && (
            <button
              type="button"
              onClick={() => setPhotoModalOpen(true)}
              className="mt-4 text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              {tReal('showMorePhotos', { count: group.images.length - INITIAL_PHOTO_LIMIT })}
            </button>
          )}
        </div>
      )}

      {group.videos.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-[var(--color-muted)]">{tReal('videosLabel')}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {group.videos.slice(0, INITIAL_VIDEO_LIMIT).map((video, i) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setVideoIndex(i)}
                className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]"
              >
                <Image
                  src={getVideoThumbnailUrl(video.publicId)}
                  alt={tReal('videoAlt', { service: serviceName, index: i + 1 })}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <PlayCircle size={36} className="text-white drop-shadow" />
                </div>
              </button>
            ))}
          </div>

          {hasMoreVideos && (
            <button
              type="button"
              onClick={() => setVideoModalOpen(true)}
              className="mt-4 text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              {tReal('showMoreVideos', { count: group.videos.length - INITIAL_VIDEO_LIMIT })}
            </button>
          )}
        </div>
      )}

      <RealisationLightbox index={photoIndex} slides={photoSlides} onClose={() => setPhotoIndex(null)} />
      <RealisationLightbox index={videoIndex} slides={videoSlides} onClose={() => setVideoIndex(null)} hasVideo />

      {hasMorePhotos && (
        <RealisationsInfiniteModal
          open={photoModalOpen}
          onOpenChange={setPhotoModalOpen}
          title={`${serviceName} — ${tReal('photosLabel')}`}
          media={{ kind: 'image', items: group.images }}
          onItemClick={(i) => setPhotoIndex(i)}
        />
      )}

      {hasMoreVideos && (
        <RealisationsInfiniteModal
          open={videoModalOpen}
          onOpenChange={setVideoModalOpen}
          title={`${serviceName} — ${tReal('videosLabel')}`}
          media={{ kind: 'video', items: group.videos }}
          onItemClick={(i) => setVideoIndex(i)}
        />
      )}
    </section>
  );
}
