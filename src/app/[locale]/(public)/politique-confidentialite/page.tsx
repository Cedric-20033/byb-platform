// src/app/[locale]/(public)/politique-confidentialite/page.tsx
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { LegalPage, LegalSection } from '@/components/legal/LegalSection';
import { company, getPrimarySite } from '@/data/company';
import {
  PRIVACY_POLICY_UPDATED_AT,
  dataProcessors,
  dataProtectionAuthority,
  getLegalCompanyName,
  legal,
} from '@/data/legal';
import { formatIsoDate } from '@/lib/date';
import { formatSiteAddress } from '@/lib/maps';
import type { Locale } from '@/lib/routing';
import { t as pick } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Clés : legal.privacyTitle, privacy.pageDescription
  const [tLegal, tPrivacy] = await Promise.all([
    getTranslations({ locale, namespace: 'legal' }),
    getTranslations({ locale, namespace: 'privacy' }),
  ]);
  return { title: tLegal('privacyTitle'), description: tPrivacy('pageDescription') };
}

const COLLECTIONS = ['appointments', 'contact', 'security'] as const;
const RIGHTS = ['access', 'rectification', 'erasure', 'restriction', 'objection', 'portability'] as const;

/**
 * Politique de confidentialité (RGPD, art. 13). Chaque traitement décrit ici correspond à un traitement réel du
 * code, et chaque durée à un mécanisme réel (voir docs/RGPD.md) : modifier l'un sans l'autre rendrait la page inexacte.
 *
 * Une donnée non fournie par le client n'est pas inventée : sans durée de conservation validée, la page le dit
 * en termes généraux (`retention.appointmentsUnset`) au lieu d'annoncer un chiffre.
 */
export default async function PrivacyPolicyPage() {
  const t = await getTranslations('privacy');
  const tLegal = await getTranslations('legal');
  const locale = (await getLocale()) as Locale;

  const headquarters = getPrimarySite();
  const months = legal.retention.appointmentsMonths;

  return (
    <LegalPage title={tLegal('privacyTitle')}>
      <p>{t('intro')}</p>
      <p className="text-xs">
        {t('updated', {
          date: formatIsoDate(PRIVACY_POLICY_UPDATED_AT, locale, { day: 'numeric', month: 'long', year: 'numeric' }),
        })}
      </p>

      <LegalSection title={t('controller.title')}>
        <p>
          {t('controller.text', {
            company: getLegalCompanyName(),
            address: formatSiteAddress(headquarters, locale),
            vat: company.tva,
            email: company.contact.email,
          })}
        </p>
      </LegalSection>

      <LegalSection title={t('collected.title')}>
        <div className="space-y-5">
          {COLLECTIONS.map((collection) => (
            <div key={collection} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
              <h3 className="font-semibold text-[var(--color-foreground)] mb-2">{t(`collected.${collection}.title`)}</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-1">
                {(['data', 'purpose', 'basis'] as const).map((field) => (
                  <div key={field} className="contents">
                    <dt className="font-medium text-[var(--color-foreground)]">{t(`collected.labels.${field}`)}</dt>
                    <dd>{t(`collected.${collection}.${field}`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title={t('retention.title')}>
        <ul className="list-disc pl-5 space-y-1">
          <li>{months === null ? t('retention.appointmentsUnset') : t('retention.appointments', { months })}</li>
          <li>{t('retention.contact')}</li>
          <li>{t('retention.security')}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t('processors.title')}>
        <p>{t('processors.intro')}</p>
        <ul className="list-disc pl-5 space-y-1">
          {dataProcessors.map((processor) => (
            <li key={processor.id}>
              <strong className="text-[var(--color-foreground)]">{processor.name}</strong> : {t(`processors.${processor.id}`)}
            </li>
          ))}
        </ul>
        <p>{t('processors.transfers')}</p>
      </LegalSection>

      <LegalSection title={t('cookies.title')}>
        <p>{t('cookies.text1')}</p>
        <p>{t('cookies.text2')}</p>
        <p>{t('cookies.text3')}</p>
      </LegalSection>

      <LegalSection title={t('rights.title')}>
        <p>{t('rights.intro')}</p>
        <ul className="list-disc pl-5 space-y-1">
          {RIGHTS.map((right) => (
            <li key={right}>{t(`rights.${right}`)}</li>
          ))}
        </ul>
        <p>{t('rights.how', { email: company.contact.email })}</p>
      </LegalSection>

      <LegalSection title={t('complaint.title')}>
        <p>
          {t('complaint.text', {
            authority: pick(dataProtectionAuthority.name, locale),
            address: dataProtectionAuthority.address,
            website: dataProtectionAuthority.website,
            email: dataProtectionAuthority.email,
          })}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
