// src/components/sections/ServiceMediaGallery.tsx
'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import VideoPlugin from 'yet-another-react-lightbox/plugins/video';
import 'yet-another-react-lightbox/styles.css';
import { PlayCircle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { t, getImageUrl, getVideoUrl, getVideoThumbnailUrl } from '@/lib/utils';
import type { Locale } from '@/lib/routing';
import type { Service } from '@/types';

/** Nombre de vignettes visibles avant le bouton "Voir plus". */
const VISIBLE_LIMIT = 6;

type Tab = 'photo' | 'video';

interface ServiceMediaGalleryProps {
  service: Service;
}

/**
 * Galerie d'un service : bascule Photos / Vidéos, grille limitée avec
 * "Voir plus", et lightbox plein écran navigable au clic (yet-another-react-lightbox).
 *
 * Architecture : ce composant reçoit `service` en props (déjà chargé par la
 * page Server Component) — il ne sait pas si les médias viennent de
 * src/data/services.ts ou, demain, de Supabase. Seule la résolution d'URL
 * (getImageUrl / getVideoUrl dans lib/utils.ts) sait parler à Cloudinary.
 *
 * Clés fr.json : services.gallery, services.galleryPhotos, services.galleryVideos, services.showMore
 */
export function ServiceMediaGallery({ service }: ServiceMediaGalleryProps) {
  const tPage = useTranslations('services');
  const locale = useLocale() as Locale;

  const hasVideos = service.videos.length > 0;
  const [tab, setTab] = useState<Tab>('photo');
  const [showAll, setShowAll] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Slides construits une seule fois par rendu pour l'onglet actif : la
  // lightbox navigue dans TOUTE la collection, pas seulement les vignettes visibles.
  // Doit rester AVANT le early return ci-dessous : les Hooks React doivent
  // s'exécuter dans le même ordre à chaque rendu, jamais après un retour conditionnel.
  const slides = useMemo(() => {
    if (tab === 'photo') {
      return service.galleryImages.map((img) => ({ src: getImageUrl(img, { width: 1600 }) }));
    }
    return service.videos.map((video) => ({
      type: 'video' as const,
      sources: [{ src: getVideoUrl(video.publicId), type: 'video/mp4' }],
      poster: getVideoThumbnailUrl(video.publicId),
    }));
  }, [tab, service.galleryImages, service.videos]);

  // Rien à afficher : ni images ni vidéos pour ce service.
  if (service.galleryImages.length === 0 && !hasVideos) return null;

  const currentCount = tab === 'photo' ? service.galleryImages.length : service.videos.length;
  const visibleCount = showAll ? currentCount : Math.min(VISIBLE_LIMIT, currentCount);

  function switchTab(next: Tab) {
    setTab(next);
    setShowAll(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-[var(--font-display)] font-black text-2xl">{tPage('gallery')}</h2>

        {/* L'onglet vidéo n'apparaît que si ce service en possède au moins une. */}
        {hasVideos && (
          <div className="flex gap-1 p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
            <TabButton active={tab === 'photo'} onClick={() => switchTab('photo')}>
              {tPage('galleryPhotos')}
            </TabButton>
            <TabButton active={tab === 'video'} onClick={() => switchTab('video')}>
              {tPage('galleryVideos')}
            </TabButton>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {tab === 'photo'
          ? service.galleryImages.slice(0, visibleCount).map((img, i) => (
              <button
                key={img}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="aspect-square relative rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface-raised)] group"
              >
                <Image
                  src={getImageUrl(img)}
                  alt={`${t(service.name, locale)} ${i + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="33vw"
                />
              </button>
            ))
          : service.videos.slice(0, visibleCount).map((video, i) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="aspect-square relative rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-surface-raised)] group"
              >
                <Image
                  src={getVideoThumbnailUrl(video.publicId)}
                  alt={`${t(service.name, locale)} — vidéo ${i + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="33vw"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <PlayCircle size={36} className="text-white drop-shadow" />
                </div>
              </button>
            ))}
      </div>

      {!showAll && currentCount > VISIBLE_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm font-semibold text-[var(--color-primary)] hover:underline"
        >
          {tPage('showMore', { count: currentCount - VISIBLE_LIMIT })}
        </button>
      )}

      <Lightbox
        open={lightboxIndex !== null}
        close={() => setLightboxIndex(null)}
        index={lightboxIndex ?? 0}
        slides={slides}
        plugins={[VideoPlugin]}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
      }`}
    >
      {children}
    </button>
  );
}
