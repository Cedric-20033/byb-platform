// src/app/[locale]/(public)/mentions-legales/page.tsx
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { LegalPage, LegalSection } from '@/components/legal/LegalSection';
import { renderPrivacyLink } from '@/components/legal/privacyLink';
import { company } from '@/data/company';
import { legal } from '@/data/legal';
import { formatSiteAddress } from '@/lib/maps';
import type { Locale } from '@/lib/routing';
import { getPrimaryPublicSite, loadPublicCompanyInfo } from '@/lib/settings/publicCompanyInfo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Clés : legal.pageTitle, legal.pageDescription
  const tPage = await getTranslations({ locale, namespace: 'legal' });
  return { title: tPage('pageTitle'), description: tPage('pageDescription') };
}

/**
 * Mentions légales. Tout le texte vient de `messages/*.json` (clé `legal.*`) et l'identité juridique vient de
 * `data/company.ts` et `data/legal.ts`, les adresses et coordonnées des réglages de l'entreprise : rien n'est écrit en dur ici, et une information non fournie par le
 * client (forme juridique, hébergeur, médiation) n'est pas affichée plutôt qu'inventée.
 */
export default async function MentionsLegalesPage() {
  const t = await getTranslations('legal');
  const locale = (await getLocale()) as Locale;

  const info = await loadPublicCompanyInfo();
  const headquarters = getPrimaryPublicSite(info);
  const otherSites = info.sites.filter((site) => site.id !== headquarters.id);

  return (
    <LegalPage title={t('pageTitle')}>
      <LegalSection title={t('publisher.title')}>
        <dl className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-x-6 gap-y-1">
          <dt className="font-medium text-[var(--color-foreground)]">{t('publisher.name')}</dt>
          <dd>{company.name}</dd>

          {company.legalForm && (
            <>
              <dt className="font-medium text-[var(--color-foreground)]">{t('publisher.legalForm')}</dt>
              <dd>{company.legalForm}</dd>
            </>
          )}

          <dt className="font-medium text-[var(--color-foreground)]">{t('publisher.vat')}</dt>
          <dd>{company.tva}</dd>

          <dt className="font-medium text-[var(--color-foreground)]">{t('publisher.address')}</dt>
          <dd>{formatSiteAddress(headquarters, locale)}</dd>

          {otherSites.length > 0 && (
            <>
              <dt className="font-medium text-[var(--color-foreground)]">{t('publisher.otherSites')}</dt>
              <dd>
                {otherSites.map((site) => (
                  <span key={site.id} className="block">
                    {site.name} : {formatSiteAddress(site, locale)}
                  </span>
                ))}
              </dd>
            </>
          )}

          <dt className="font-medium text-[var(--color-foreground)]">{t('publisher.email')}</dt>
          <dd>
            <a href={`mailto:${info.contact.email}`} className="underline underline-offset-2">
              {info.contact.email}
            </a>
          </dd>

          {info.contact.phone && (
            <>
              <dt className="font-medium text-[var(--color-foreground)]">{t('publisher.phone')}</dt>
              <dd>{info.contact.phone}</dd>
            </>
          )}
        </dl>
      </LegalSection>

      {legal.host && (
        <LegalSection title={t('host.title')}>
          <p>{t('host.intro')}</p>
          <p>
            <strong>{legal.host.name}</strong>, {legal.host.address}
          </p>
        </LegalSection>
      )}

      <LegalSection title={t('intellectualProperty.title')}>
        <p>{t('intellectualProperty.text', { company: company.name })}</p>
      </LegalSection>

      <LegalSection title={t('liability.title')}>
        <p>{t('liability.text')}</p>
      </LegalSection>

      <LegalSection title={t('personalData.title')}>
        <p>{t.rich('personalData.text', { link: renderPrivacyLink(locale) })}</p>
      </LegalSection>

      {legal.mediation && (
        <LegalSection title={t('mediation.title')}>
          <p>{t('mediation.intro')}</p>
          <p>
            <strong>{legal.mediation.name}</strong>, {legal.mediation.address}
            {legal.mediation.website && (
              <>
                {' '}
                <a href={legal.mediation.website} className="underline underline-offset-2" rel="noopener noreferrer">
                  {legal.mediation.website}
                </a>
              </>
            )}
          </p>
        </LegalSection>
      )}

      <LegalSection title={t('law.title')}>
        <p>{t('law.text')}</p>
      </LegalSection>
    </LegalPage>
  );
}
