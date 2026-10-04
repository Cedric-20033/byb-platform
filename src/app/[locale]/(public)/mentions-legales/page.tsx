// src/app/[locale]/(public)/mentions-legales/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { company, getPrimarySite } from '@/data/company';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Clé fr.json : legal.pageTitle
  const tPage = await getTranslations({ locale, namespace: 'legal' });
  return { title: tPage('pageTitle') };
}

export default function MentionsLegalesPage() {
  const headquarters = getPrimarySite();

  return (
    <section className="section-padding">
      <div className="container-custom max-w-3xl">
        <h1 className="text-4xl font-[var(--font-display)] font-black mb-10">Mentions légales</h1>
        <div className="space-y-8 text-[var(--color-muted)] text-sm leading-relaxed">
          <Block title="Éditeur du site">
            <p><strong>{company.fullName}</strong>{company.legalForm && ` — ${company.legalForm}`}</p>
            <p>TVA / BCE : {company.tva}</p>
            <p>{headquarters.address.street}, {headquarters.address.postalCode} {headquarters.address.city}</p>
            <p>Email : {company.contact.email}</p>
          </Block>
          <Block title="Hébergement">
            <p>Ce site est hébergé par Vercel Inc., 340 Pine Street, Suite 900, San Francisco, CA 94104, USA.</p>
          </Block>
          <Block title="Propriété intellectuelle">
            <p>L&apos;ensemble du contenu de ce site est la propriété exclusive de {company.fullName} et est protégé par la législation applicable en matière de propriété intellectuelle.</p>
          </Block>
          <Block title="Données personnelles">
            <p>Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données. Contactez-nous à {company.contact.email}.</p>
          </Block>
        </div>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-[var(--font-display)] font-bold text-lg text-[var(--color-foreground)] mb-2">{title}</h2>
      {children}
    </div>
  );
}