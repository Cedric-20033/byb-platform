// src/lib/seo/structuredData.ts
import { company } from '@/data/company';
import type { PublicCompanyInfo } from '@/lib/settings/publicCompanyInfo';
import { t } from '@/lib/utils';
import { absoluteUrl } from './siteUrl';

/** Pays par défaut du schéma : l'entreprise intervient en Belgique (code ISO 3166-1 alpha-2). */
const COUNTRY_CODE = 'BE';

/**
 * Données structurées schema.org de l'entreprise (`GeneralContractor`, sous-type de `LocalBusiness`).
 * L'entité principale porte l'identité ; chaque site physique est un `department` avec sa propre adresse,
 * ce qui permet à Google d'associer Asselt et Liège à la même entreprise plutôt que de les voir comme deux concurrents.
 * Un champ vide dans les réglages est omis : mieux vaut ne rien déclarer qu'une valeur invalide.
 */
export function buildCompanyJsonLd(info: PublicCompanyInfo, locale: string): Record<string, unknown> {
  const sameAs = Object.values(info.socialLinks).filter((url): url is string => Boolean(url));

  return omitEmpty({
    '@context': 'https://schema.org',
    '@type': 'GeneralContractor',
    '@id': absoluteUrl('/#organization'),
    name: company.name,
    description: t(company.description, locale),
    url: absoluteUrl(`/${locale}`),
    logo: absoluteUrl('/Images/logo.png'),
    image: absoluteUrl('/Images/equipe.jpg'),
    telephone: info.contact.phone || info.contact.mobile,
    email: info.contact.email,
    vatID: company.tva,
    foundingDate: String(company.foundedYear),
    areaServed: { '@type': 'Country', name: 'Belgium' },
    sameAs,
    department: info.sites.map((site) => ({
      '@type': 'GeneralContractor',
      name: site.name,
      telephone: info.contact.phone || info.contact.mobile,
      address: {
        '@type': 'PostalAddress',
        streetAddress: site.address.street,
        postalCode: site.address.postalCode,
        addressLocality: site.address.city,
        addressCountry: COUNTRY_CODE,
      },
    })),
  });
}

/** Retire les valeurs vides (chaîne vide, tableau vide, `undefined`) au premier niveau. */
function omitEmpty(entity: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entity).filter(([, value]) => !(value === undefined || value === '' || (Array.isArray(value) && value.length === 0))),
  );
}

/**
 * Sérialise pour une balise `<script type="application/ld+json">`. Le `<` est échappé : un champ saisi dans le
 * dashboard contenant `</script>` fermerait sinon la balise et permettrait d'injecter du HTML.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
