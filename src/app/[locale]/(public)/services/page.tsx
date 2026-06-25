// src/app/[locale]/(public)/services/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { t, getImageUrl } from '@/lib/utils';
// Architecture hexagonale : import data/ uniquement dans les Server Components (pages)
import { getActiveServices } from '@/data/services';
import { Card } from '@/components/ui/Card';
import { CtaSection } from '@/components/sections/HomesSection';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Clés fr.json : services.pageTitle, services.pageDescription
  const tPage = await getTranslations({ locale, namespace: 'services' });
  return { title: tPage('pageTitle'), description: tPage('pageDescription') };
}

export default async function ServicesPage() {
  const locale   = await getLocale();
  const tPage    = await getTranslations('services');
  const services = getActiveServices();

  return (
    <>
      <section className="section-padding bg-[var(--color-primary)] text-white diagonal-bottom">
        <div className="container-custom text-center pb-8">
          <p className="eyebrow text-white/60 mb-4">{tPage('pageTitle')}</p>
          <h1 className="text-5xl lg:text-6xl font-[var(--font-display)] font-black">{tPage('pageTitle')}</h1>
          <p className="text-white/70 text-lg mt-4 max-w-xl mx-auto">{tPage('pageDescription')}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service) => (
              <Link key={service.id} href={`/services/${service.slug}`} className="block group">
                <Card hover className="overflow-hidden h-full">
                  <div className="aspect-video relative bg-[var(--color-surface-raised)]">
                    <Image
                      src={getImageUrl(service.coverImage)}
                      alt={t(service.name, locale)}
                      fill className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="p-6 flex flex-col gap-3">
                    <h2 className="font-[var(--font-display)] font-black text-2xl">{t(service.name, locale)}</h2>
                    <p className="text-[var(--color-muted)] text-sm leading-relaxed flex-1">{t(service.shortDescription, locale)}</p>
                    {service.subServices.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {service.subServices.map((sub) => (
                          <span key={sub.id} className="text-xs px-3 py-1 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-muted)]">
                            {/* Clé fr.json : services.subServices */}
                            {t(sub.name, locale)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] group-hover:gap-3 transition-all pt-2">
                      {tPage('bookService')} <ArrowRight size={15} />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaSection />
    </>
  );
}