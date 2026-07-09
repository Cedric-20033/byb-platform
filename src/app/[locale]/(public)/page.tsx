// src/app/[locale]/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// ─── Imports données (couche data/ — source de vérité actuelle) ──────────────

// Les composants sections reçoivent tout en props → ils ne savent pas d'où viennent les données.
// Phase 3 : remplacer ces imports par des appels aux repositories Supabase ici uniquement.
import { getHighlightedProjects } from '@/data/projects';
import { homeAbout } from '@/data/home';
import { testimonials } from '@/data/testimonials';
import { stats } from '@/data/stats';

// ─── Composants sections
import { HeroSection } from '@/components/sections/HeroSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { TestimonialsSection, AboutSnippet, CtaSection } from '@/components/sections/HomesSection';

// Nombre de services mis en avant sur la page d'accueil.
// Le catalogue complet (10 métiers) reste consultable sur /services.
const HOME_SERVICES_LIMIT = 4;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  return {
    title: 'BYB Construction — Construction générale en Belgique',
    description: t('subtitle'),
  };
}

export default function HomePage() {
  // Le Server Component récupère les données et les descend en props
  const projects = getHighlightedProjects();

  return (
    <>
      <HeroSection />
      <AboutSnippet about={homeAbout} />
      {/* ServicesSection importe encore directement — acceptable pour l'instant
          car les services sont statiques. En phase 3, passer en props comme les autres. */}
      <ServicesSection limit={HOME_SERVICES_LIMIT} />
      <StatsSection stats={stats} />
      <ProjectsSection projects={projects} />
      <TestimonialsSection testimonials={testimonials} />
      <CtaSection />
    </>
  );
}