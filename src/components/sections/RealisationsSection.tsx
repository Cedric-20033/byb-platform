// src/components/sections/RealisationsSection.tsx
'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedPath, Locale } from '@/lib/routing';
import { ZoomIn } from 'lucide-react';
import { t, getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { HomeRealisationItem } from '@/application/catalog/GetHomeRealisationMedia';
import { RealisationLightbox } from './RealisationLightbox';

type RealisationsSectionProps = {
  items: HomeRealisationItem[];
};

/**
 * Section "Réalisations" de la page d'accueil.
 *
 * `items` est déjà le résultat du tirage "aléatoire mais stable" par service
 * (cf. application/catalog/GetHomeRealisationMedia) — ce composant se
 * contente d'afficher la grille et la lightbox associée. Il n'y a plus de
 * filtres par catégorie ici (ils vivent désormais sur la page /realisations,
 * organisée par service) ni de titre/description par photo : la seule
 * légende disponible est le nom du service, affiché au survol.
 *
 * Clés fr.json : home.projects.eyebrow, home.projects.title, home.projects.cta
 */
export function RealisationsSection({ items }: RealisationsSectionProps) {
  const tSection = useTranslations('home.projects');
  const locale = useLocale() as Locale;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const slides = useMemo(() => items.map((item) => ({ src: getImageUrl(item.publicId, { width: 1600 }) })), [items]);

  if (items.length === 0) return null;

  return (
    <section className="section-padding bg-[var(--color-surface-raised)]">
      <div className="container-custom">
        <div className="mb-14 text-center">
          <p className="eyebrow mb-3">{tSection('eyebrow')}</p>
          <h2 className="text-4xl font-[var(--font-display)] font-black lg:text-5xl">{tSection('title')}</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <button
              key={`${item.serviceId}-${item.publicId}`}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)]"
            >
              <Image
                src={getImageUrl(item.publicId, { width: 800, height: 600 })}
                alt={t(item.serviceName, locale)}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-primary)]/0 transition-all duration-300 group-hover:bg-[var(--color-primary)]/70">
                <ZoomIn size={28} className="text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left">
                <span className="text-sm font-semibold text-white">{t(item.serviceName, locale)}</span>
              </div>
            </button>
          ))}
        </div>

        <RealisationLightbox index={lightboxIndex} slides={slides} onClose={() => setLightboxIndex(null)} />

        <div className="mt-10 text-center">
          <Link href={getLocalizedPath('/realisations', locale)}>
            <Button variant="outline">{tSection('cta')}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
