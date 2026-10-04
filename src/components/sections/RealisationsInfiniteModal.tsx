// src/components/sections/RealisationsInfiniteModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Dialog } from '@base-ui/react/dialog';
import { X, PlayCircle } from 'lucide-react';
import { getImageUrl, getVideoThumbnailUrl } from '@/lib/utils';
import type { ServiceVideo } from '@/types';

/** Nombre de vignettes ajoutées à chaque passage du repère de scroll. */
const BATCH_SIZE = 15;

type ImageMedia = { kind: 'image'; items: string[] };
type VideoMedia = { kind: 'video'; items: ServiceVideo[] };

type RealisationsInfiniteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  media: ImageMedia | VideoMedia;
  /** Index dans le tableau COMPLET `media.items` — permet à la lightbox du parent de rouvrir au bon endroit. */
  onItemClick: (index: number) => void;
};

/**
 * Modale "voir plus" façon Google Photos : plutôt que de restituer d'un coup
 * toutes les vignettes d'un service (potentiellement des dizaines), on n'en
 * affiche qu'un premier lot et on en ajoute progressivement à mesure que
 * l'utilisateur approche du bas de la grille — un IntersectionObserver sur un
 * repère invisible déclenche le chargement du lot suivant, sans jamais payer
 * le coût de rendu de tout le média en une fois.
 *
 * Le clic sur une vignette ne fait qu'informer le parent de l'index choisi :
 * c'est la RealisationLightbox (déjà montée par le composant appelant) qui
 * s'ouvre par-dessus — cette modale n'affiche donc jamais d'agrandissement
 * elle-même, elle reste une simple grille de découverte.
 */
export function RealisationsInfiniteModal({
  open,
  onOpenChange,
  title,
  media,
  onItemClick,
}: RealisationsInfiniteModalProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setVisibleCount(BATCH_SIZE);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;

    // `root` = le conteneur scrollable de la modale (et non le viewport du
    // navigateur) : la modale peut être plus petite que l'écran, l'observer
    // doit donc surveiller SON scroll interne, pas celui de la page.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((count) => Math.min(count + BATCH_SIZE, media.items.length));
        }
      },
      { root, rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, media.items.length]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/60 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] transition-all duration-200 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
              <Dialog.Title className="font-[var(--font-display)] text-lg font-bold">{title}</Dialog.Title>
              <Dialog.Close
                aria-label="Fermer"
                className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
              >
                <X size={20} />
              </Dialog.Close>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.kind === 'image'
                  ? media.items.slice(0, visibleCount).map((publicId, i) => (
                      <button
                        key={`${publicId}-${i}`}
                        type="button"
                        onClick={() => onItemClick(i)}
                        className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]"
                      >
                        <Image
                          src={getImageUrl(publicId, { width: 400, height: 400 })}
                          alt={`${title} ${i + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="200px"
                        />
                      </button>
                    ))
                  : media.items.slice(0, visibleCount).map((video, i) => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => onItemClick(i)}
                        className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]"
                      >
                        <Image
                          src={getVideoThumbnailUrl(video.publicId)}
                          alt={`${title} ${i + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="200px"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <PlayCircle size={30} className="text-white drop-shadow" />
                        </div>
                      </button>
                    ))}
              </div>

              {/* Repère invisible : son entrée dans le viewport de la modale déclenche le chargement du lot suivant. */}
              {visibleCount < media.items.length && <div ref={sentinelRef} className="h-10" />}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
