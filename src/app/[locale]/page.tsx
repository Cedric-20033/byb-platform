// src/app/[locale]/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// ─── Imports données (couche data/ — source de vérité actuelle) ──────────────

// Les composants sections reçoivent tout en props → ils ne savent pas d'où viennent les données.
// Phase 3 : remplacer ces imports par des appels aux repositories Supabase ici uniquement.
import { getActiveServices } from '@/data/services';
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  return {
    title: 'BYB Bâtiment & Rénovation — Artisan de confiance depuis 2005',
    description: t('subtitle'),
  };
}

export default function HomePage() {
  // Le Server Component récupère les données et les descend en props
  const services  = getActiveServices();
  const projects  = getHighlightedProjects();

  return (
    <>
      <HeroSection />
      <AboutSnippet about={homeAbout} />
      {/* ServicesSection importe encore directement — acceptable pour l'instant
          car les services sont statiques. En phase 3, passer en props comme les autres. */}
      <ServicesSection />
      <StatsSection stats={stats} />
      <ProjectsSection projects={projects} />
      <TestimonialsSection testimonials={testimonials} />
      <CtaSection />
    </>
  );
}