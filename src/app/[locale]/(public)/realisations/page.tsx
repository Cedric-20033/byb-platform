// src/app/[locale]/(public)/realisations/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
// Architecture hexagonale : seule la page importe les données — les composants reçoivent en props
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';
import { getRealisationsByService } from '@/application/catalog/GetRealisationsByService';
import { RealisationsExplorer } from '@/components/sections/RealisationsExplorer';
import { CtaSection } from '@/components/sections/HomesSection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Clés fr.json : realisations.pageTitle, realisations.pageDescription
  const tPage = await getTranslations({ locale, namespace: 'realisations' });
  return { title: tPage('pageTitle'), description: tPage('pageDescription') };
}

export default async function RealisationsPage() {
  const tPage = await getTranslations('realisations');

  const supabase = await createClient();
  const services = await new SupabaseServiceRepository(supabase).findAll({ activeOnly: true });
  const groups = getRealisationsByService(services);

  return (
    <>
      <section className="section-padding diagonal-bottom bg-[var(--color-primary)] text-white">
        <div className="container-custom pb-8 text-center">
          <p className="eyebrow mb-4 text-white/60">Portfolio</p>
          <h1 className="text-5xl font-[var(--font-display)] font-black lg:text-6xl">{tPage('pageTitle')}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">{tPage('pageDescription')}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          {groups.length === 0 ? (
            <p className="py-10 text-center text-[var(--color-muted)]">{tPage('noMedia')}</p>
          ) : (
            <RealisationsExplorer groups={groups} />
          )}
        </div>
      </section>

      <CtaSection />
    </>
  );
}
