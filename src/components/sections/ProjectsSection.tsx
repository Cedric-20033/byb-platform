// src/components/sections/ProjectsSection.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getLocalizedPath, Locale } from '@/lib/routing';
import { X, ZoomIn } from 'lucide-react';
import { t, getImageUrl, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { Project, Service } from '@/types';

// ─── Galerie réutilisable (page accueil + page réalisations) ──────────────────

interface ProjectsGalleryProps {
  projects: Project[];
  /** Si true, affiche les filtres par catégorie (page /realisations) */
  showFilters?: boolean;
  /** Services nécessaires pour afficher les labels de filtres */
  services?: Service[];
}

/**
 * Architecture hexagonale :
 *   Ce composant reçoit toujours ses données en props — il ne sait pas d'où elles viennent.
 *   Aujourd'hui : src/data/projects.ts via la page parente.
 *   Phase 3 : Supabase via repository, sans modifier ce composant.
 *
 * Clés fr.json : realisations.filterAll, realisations.noResults
 */
export function ProjectsGallery({ projects, showFilters = false, services = [] }: ProjectsGalleryProps) {
  const tReal  = useTranslations('realisations');
  const locale = useLocale() as Locale;
  const [activeFilter, setActiveFilter]       = useState('all');
  const [lightboxProject, setLightboxProject] = useState<Project | null>(null);

  const filtered = activeFilter === 'all'
    ? projects
    : projects.filter((p) => p.category === activeFilter);

  return (
    <>
      {showFilters && (
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <FilterBtn active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>
            {tReal('filterAll')}
          </FilterBtn>
          {services.map((s) => (
            <FilterBtn key={s.id} active={activeFilter === s.slug} onClick={() => setActiveFilter(s.slug)}>
              {t(s.name, locale)}
            </FilterBtn>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-[var(--color-muted)] py-10">{tReal('noResults')}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((project) => (
          <article
            key={project.id}
            className="group relative rounded-[var(--radius-lg)] overflow-hidden cursor-pointer bg-[var(--color-surface-raised)]"
            onClick={() => setLightboxProject(project)}
          >
            <div className="aspect-[4/3] relative">
              <Image
                src={getImageUrl(project.image)}
                alt={t(project.title, locale)}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-[var(--color-primary)]/0 group-hover:bg-[var(--color-primary)]/70 transition-all duration-300 flex items-center justify-center">
                <ZoomIn size={28} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-[var(--font-display)] font-bold text-base leading-tight">{t(project.title, locale)}</h3>
              <p className="text-xs text-[var(--color-muted)] mt-1">{formatDate(project.date, locale)}</p>
            </div>
          </article>
        ))}
      </div>

      {lightboxProject && (
        <Lightbox project={lightboxProject} locale={locale} onClose={() => setLightboxProject(null)} />
      )}
    </>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
      active
        ? 'bg-[var(--color-primary)] text-white'
        : 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:text-[var(--color-foreground)]'
    }`}>
      {children}
    </button>
  );
}

function Lightbox({ project, locale, onClose }: { project: Project; locale: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={onClose} aria-label="Fermer"><X size={28} /></button>
      <div className="relative max-w-4xl w-full max-h-[85vh] rounded-[var(--radius-lg)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Image src={getImageUrl(project.image)} alt={t(project.title, locale)} width={1200} height={800} className="object-contain w-full h-full" />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4">
          <h3 className="text-white font-[var(--font-display)] font-bold text-lg">{t(project.title, locale)}</h3>
          <p className="text-white/70 text-sm mt-1">{t(project.description, locale)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Wrapper section pour la page d'accueil ───────────────────────────────────

interface ProjectsSectionProps {
  projects: Project[];
}

/**
 * Clés fr.json : home.projects.eyebrow, home.projects.title, home.projects.cta
 */
export function ProjectsSection({ projects }: ProjectsSectionProps) {
  const tSection = useTranslations('home.projects');
  const locale = useLocale() as Locale;

  return (
    <section className="section-padding bg-[var(--color-surface-raised)]">
      <div className="container-custom">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">{tSection('eyebrow')}</p>
          <h2 className="text-4xl lg:text-5xl font-[var(--font-display)] font-black">{tSection('title')}</h2>
        </div>
        <ProjectsGallery projects={projects} />
        <div className="text-center mt-10">
          <Link href={getLocalizedPath('/realisations', locale)}>
            <Button variant="outline">{tSection('cta')}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}