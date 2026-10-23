// src/app/[locale]/(public)/rdv/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseServiceRepository } from '@/infrastructure/supabase/repositories/SupabaseServiceRepository';
import { resolveBookingPreselection } from '@/lib/booking/resolveBookingPreselection';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { Card } from '@/components/ui/Card';
import { buildLocaleAlternates } from '@/lib/seo/alternates';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Clés : booking.page.title, booking.page.description
  const tPage = await getTranslations({ locale, namespace: 'booking.page' });
  return {
    title: tPage('title'),
    description: tPage('description'),
    // Canonique sans `?service=…` : les présélections ne sont pas des pages distinctes.
    alternates: buildLocaleAlternates('/rdv', locale),
  };
}

/**
 * Page de réservation pleine page.
 *
 * Accepte `?service=<slug>&sub=<slug>` pour présélectionner la prestation
 * (liens depuis une fiche service, un email, une campagne). La résolution
 * des slugs se fait ici, côté serveur, sur le catalogue actif : le wizard
 * ne reçoit que des objets déjà validés.
 */
export default async function BookingPage({ searchParams }: Props) {
  // Clés : booking.page.heading, booking.page.subtitle
  const [tPage, query] = await Promise.all([getTranslations('booking.page'), searchParams]);

  const supabase = await createClient();
  const services = await new SupabaseServiceRepository(supabase).findAll({ activeOnly: true });

  const { service, subService } = resolveBookingPreselection(services, query.service, query.sub);

  return (
    <>
      <section className="section-padding bg-[var(--color-primary)] text-white diagonal-bottom">
        <div className="container-custom text-center pb-8">
          <h1 className="text-4xl lg:text-6xl font-[var(--font-display)] font-black">
            {tPage('heading')}
          </h1>
          <p className="text-white/70 text-lg mt-4 max-w-xl mx-auto">{tPage('subtitle')}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <Card className="max-w-2xl mx-auto p-6 sm:p-8">
            {/*
              Le wizard ne lit sa présélection qu'au montage : la clé le remonte
              quand l'URL change sans rechargement (navigation entre deux liens
              /rdv?service=…), sinon la nouvelle sélection serait ignorée.
            */}
            <BookingWizard
              key={`${service?.slug ?? ''}:${subService?.slug ?? ''}`}
              services={services}
              initialService={service ?? undefined}
              initialSubService={subService ?? undefined}
            />
          </Card>
        </div>
      </section>
    </>
  );
}
