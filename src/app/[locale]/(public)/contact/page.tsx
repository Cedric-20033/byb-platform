// src/app/[locale]/(public)/contact/page.tsx
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { ConsentMap } from '@/components/contact/ConsentMap';
import { ContactForm } from '@/components/contact/ContactForm';
import { Card } from '@/components/ui/Card';
import { buildMapEmbedUrl } from '@/lib/maps';
import { loadPublicCompanyInfo } from '@/lib/settings/publicCompanyInfo';
import { buildLocaleAlternates } from '@/lib/seo/alternates';
import { t } from '@/lib/utils';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Clés : contact.title, contact.metaDescription
  const tPage = await getTranslations({ locale, namespace: 'contact' });
  return {
    title: tPage('title'),
    description: tPage('metaDescription'),
    alternates: buildLocaleAlternates('/contact', locale),
  };
}

/**
 * Page contact — Server Component : seules les données de l'entreprise et le formulaire (`ContactForm`,
 * seul composant interactif) y figurent. Les coordonnées et les cartes viennent des réglages de l'entreprise
 * (`/dashboard/settings`) : ajouter un site là-bas suffit à l'afficher ici, avec sa propre carte.
 *
 * Clés : contact.title, contact.subtitle, contact.info.*, contact.map.title
 */
export default async function ContactPage() {
  const tPage = await getTranslations('contact');
  const locale = await getLocale();
  const company = await loadPublicCompanyInfo();

  return (
    <>
      <section className="section-padding bg-[var(--color-primary)] text-white diagonal-bottom">
        <div className="container-custom text-center pb-8">
          <h1 className="text-5xl lg:text-6xl font-[var(--font-display)] font-black">{tPage('title')}</h1>
          <p className="text-white/70 text-lg mt-4">{tPage('subtitle')}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-3">
              <Card className="p-8">
                <ContactForm />
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <ul className="space-y-4">
                <InfoItem icon={MapPin} label={tPage('info.address')}>
                  {company.sites.map((site) => (
                    <p key={site.id} className="mb-2 last:mb-0">
                      <span className="font-semibold">{site.name}</span>
                      <br />
                      {site.address.street}
                      <br />
                      {site.address.postalCode} {site.address.city}
                    </p>
                  ))}
                </InfoItem>
                {company.contact.phone && (
                  <InfoItem icon={Phone} label={tPage('info.phone')}>
                    <a href={`tel:${company.contact.phone}`} className="hover:text-[var(--color-primary)]">
                      {company.contact.phone}
                    </a>
                  </InfoItem>
                )}
                <InfoItem icon={Mail} label={tPage('info.email')}>
                  <a href={`mailto:${company.contact.email}`} className="hover:text-[var(--color-primary)]">
                    {company.contact.email}
                  </a>
                </InfoItem>
                <InfoItem icon={Clock} label={tPage('info.hours')}>
                  {t(company.openingHours, locale)}
                </InfoItem>
              </ul>

              <div className="space-y-6">
                {company.sites.map((site) => (
                  <div key={site.id} className="space-y-2" data-testid={`site-map-${site.id}`}>
                    <h2 className="text-sm font-semibold text-[var(--color-foreground)]">{site.name}</h2>

                    <div className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] h-64 md:h-72">
                      <ConsentMap
                        src={buildMapEmbedUrl(site, locale)}
                        title={tPage('map.title', { name: site.name })}
                        siteName={site.name}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function InfoItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[var(--color-primary)]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide font-semibold">{label}</p>
        <div className="text-sm mt-0.5 leading-relaxed">{children}</div>
      </div>
    </li>
  );
}
