// src/app/[locale]/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// ─── Imports données (couche data/ — encore source de vérité pour projects/home/testimonials/stats) ──────────────

// Les composants sections reçoivent tout en props → ils ne savent pas d'où viennent les données.
import { getHomeRealisationMedia } from '@/application/catalog/GetHomeRealisationMedia';
import { homeAbout } from '@/data/home';
import { GetPublishedTestimonials } from '@/application/testimonials/GetPublishedTestimonials';
import { stats } from '@/data/stats';

// Services : migrés vers Supabase (voir scripts/migrate-services-to-supabase.ts).
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';
import { SupabaseTestimonialRepository } from '@/infrastructure/supabase/repositories/SupabaseTestimonialRepository';

// ─── Composants sections
import { HeroSection } from '@/components/sections/HeroSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { RealisationsSection } from '@/components/sections/RealisationsSection';
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

export default async function HomePage() {
  // Le Server Component récupère les données et les descend en props
  const supabase = await createClient();
  const services = await new SupabaseServiceRepository(supabase).findAll({ activeOnly: true });

  // Quelques photos par service, tirage déterministe (cf. GetHomeRealisationMedia) —
  // stable au refresh, sans jamais se limiter aux mêmes premières photos.
  const realisationItems = getHomeRealisationMedia(services);

  // Témoignages publiés depuis le dashboard (data/testimonials.ts n'est plus qu'une source d'import).
  const testimonials = await new GetPublishedTestimonials(new SupabaseTestimonialRepository(supabase)).execute();

  return (
    <>
      <HeroSection />
      <AboutSnippet about={homeAbout} />
      <ServicesSection services={services} limit={HOME_SERVICES_LIMIT} />
      <StatsSection stats={stats} />
      <RealisationsSection items={realisationItems} />
      {/* Sans avis publié, la section est omise plutôt que d'afficher un bloc vide. */}
      {testimonials.length > 0 && <TestimonialsSection testimonials={testimonials} />}
      <CtaSection />
    </>
  );
}