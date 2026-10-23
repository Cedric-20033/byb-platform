// src/app/[locale]/(public)/layout.tsx
import { getLocale } from 'next-intl/server';
import { PublicChrome } from '@/components/layout/PublicChrome';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildCompanyJsonLd } from '@/lib/seo/structuredData';
import { loadPublicCompanyInfo } from '@/lib/settings/publicCompanyInfo';

/**
 * Layout du groupe de routes publiques.
 * Les parenthèses dans le nom du dossier (public) créent un groupe logique
 * sans modifier les URLs — le dashboard admin (groupe frère (admin)) n'hérite
 * jamais de ce chrome. L'identité de l'entreprise (JSON-LD) n'est donc publiée
 * que sur les pages publiques.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [locale, info] = await Promise.all([getLocale(), loadPublicCompanyInfo()]);

  return (
    <>
      <JsonLd data={buildCompanyJsonLd(info, locale)} />
      <PublicChrome>{children}</PublicChrome>
    </>
  );
}
