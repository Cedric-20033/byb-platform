// src/app/[locale]/(public)/realisations/page.tsx
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
// Architecture hexagonale : seule la page importe les données — les composants reçoivent en props
import { projects } from "@/data/projects";
import { getActiveServices } from "@/data/services";
import { ProjectsGallery } from "@/components/sections/ProjectsSection";
import { CtaSection } from "@/components/sections/HomesSection";
import { Locale } from "@/lib/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Clés fr.json : realisations.pageTitle, realisations.pageDescription
  const tPage = await getTranslations({ locale, namespace: "realisations" });
  return { title: tPage("pageTitle"), description: tPage("pageDescription") };
}

export default async function RealisationsPage() {
  //const locale = await getLocale() as Locale;
  const tPage = await getTranslations("realisations");
  const services = getActiveServices();

  return (
    <>
      <section className="section-padding bg-[var(--color-primary)] text-white diagonal-bottom">
        <div className="container-custom text-center pb-8">
          <p className="eyebrow text-white/60 mb-4">Portfolio</p>
          <h1 className="text-5xl lg:text-6xl font-[var(--font-display)] font-black">
            {tPage("pageTitle")}
          </h1>
          <p className="text-white/70 text-lg mt-4 max-w-xl mx-auto">
            {tPage("pageDescription")}
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          {/* showFilters=true + services pour les labels des boutons de filtre */}
          <ProjectsGallery
            projects={projects}
            showFilters
            services={services}
          />
        </div>
      </section>

      <CtaSection />
    </>
  );
}
