// src/app/[locale]/(public)/services/[slug]/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { t, getImageUrl } from "@/lib/utils";
import { getLocalizedPath, Locale } from "@/lib/routing";
import { buildLocaleAlternates } from "@/lib/seo/alternates";
import { createClient } from "@/infrastructure/supabase/server";
import { SupabaseServiceRepository } from "@/infrastructure/supabase/repositories/SupabaseServiceRepository";
import { company } from "@/data/company";
import { Button } from "@/components/ui/Button";
import { ServiceBookingButton } from "@/components/booking/ServiceBookingButton";
import { ServiceMediaGallery } from "@/components/sections/ServiceMediaGallery";
import { CtaSection } from "@/components/sections/HomesSection";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

// Les services viennent de Supabase et la page lit la session (cookies) : elle est rendue à la demande, avec les données
// du moment, comme les autres pages publiques. Un `generateStaticParams()` (même vide) la rendrait statique et ferait
// échouer chaque requête en production (`DYNAMIC_SERVER_USAGE`), préchargements des liens compris. Le build ne dépend
// toujours pas de la disponibilité de la base : rien n'est généré à la compilation.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const supabase = await createClient();
  const service = await new SupabaseServiceRepository(supabase).findBySlug(slug);
  if (!service) {
    const tPage = await getTranslations({ locale, namespace: "services" });
    return { title: tPage("notFound") };
  }
  return {
    title: t(service.name, locale),
    description: t(service.shortDescription, locale),
    alternates: buildLocaleAlternates(`/services/${slug}`, locale),
    openGraph: { images: [{ url: getImageUrl(service.coverImage) }] },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale() as Locale;
  // Clés : services.backToServices, subServices, gallery, bookService, readyTitle, readySubtitle, callDirectly, otherServices
  const tPage = await getTranslations("services");

  const supabase = await createClient();
  const repository = new SupabaseServiceRepository(supabase);

  const service = await repository.findBySlug(slug);
  if (!service) notFound();

  const allServices = await repository.findAll({ activeOnly: true });
  const otherServices = allServices.filter((s) => s.slug !== slug);

  return (
    <>
      {/* Hero */}
      <section className="relative h-72 lg:h-96 flex items-end overflow-hidden">
        <Image
          src={getImageUrl(service.coverImage)}
          alt={t(service.name, locale)}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-foreground)]/90 to-transparent" />
        <div className="relative z-10 container-custom pb-10">
          <Link
            href={getLocalizedPath("/services", locale)}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={15} /> {tPage("backToServices")}
          </Link>
          <h1 className="text-5xl lg:text-6xl font-[var(--font-display)] font-black text-white">
            {t(service.name, locale)}
          </h1>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contenu principal */}
            <div className="lg:col-span-2 space-y-8">
              <p className="text-[var(--color-muted)] text-lg leading-relaxed">
                {t(service.fullDescription, locale)}
              </p>

              {service.subServices.length > 0 && (
                <div>
                  <h2 className="font-[var(--font-display)] font-black text-2xl mb-5">
                    {tPage("subServices")}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {service.subServices.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                      >
                        <CheckCircle2
                          size={18}
                          className="text-[var(--color-secondary)] mt-0.5 shrink-0"
                        />
                        <div>
                          <h3 className="font-semibold text-sm">
                            {t(sub.name, locale)}
                          </h3>
                          <p className="text-xs text-[var(--color-muted)] mt-1">
                            {t(sub.description, locale)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ServiceMediaGallery service={service} />
            </div>

            {/* Sidebar sticky */}
            <aside className="space-y-4">
              <div className="sticky top-24 p-6 rounded-[var(--radius-xl)] bg-[var(--color-primary)] text-white space-y-4">
                <h3 className="font-[var(--font-display)] font-black text-xl">
                  {tPage("readyTitle")}
                </h3>
                <p className="text-white/75 text-sm">
                  {tPage("readySubtitle")}
                </p>
                {/* Ouvre le wizard directement sur ce service, sans repasser par /contact. */}
                <ServiceBookingButton
                  services={allServices}
                  initialService={service}
                  label={tPage("bookService")}
                  className="w-full"
                />
                <a href={`tel:${company.contact.phone.replace(/\s/g, "")}`} className="block">
                  <Button
                    variant="outline"
                    className="w-full border-white/40 text-white hover:bg-white hover:text-[var(--color-primary)]"
                  >
                    {tPage("callDirectly")}
                  </Button>
                </a>
              </div>

              <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h3 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-wider text-[var(--color-muted)] mb-3">
                  {tPage("otherServices")}
                </h3>
                <ul className="space-y-2">
                  {otherServices.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={getLocalizedPath(`/services/${s.slug}`, locale)}
                        className="text-sm hover:text-[var(--color-primary)] transition-colors"
                      >
                        {t(s.name, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <CtaSection />
    </>
  );
}
