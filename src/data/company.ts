// src/data/company.ts
import type { I18nField } from '@/lib/utils';

/**
 * Informations de l'entreprise cliente.
 * Source de vérité jusqu'à la migration vers Supabase.
 *
 * À REMPLACER par les vraies données client dès réception.
 */
export const company = {
  name: 'BYB',
  fullName: 'BYB Bâtiment & Rénovation',
  legalForm: 'SAS',
  siret: '000 000 000 00000',        // à remplacer
  tva: 'FR 00 000000000',            // à remplacer
  foundedYear: 2005,

  slogan: {
    fr: "L'excellence au service de votre bâtiment",
    en: 'Excellence at the service of your building',
    de: 'Exzellenz im Dienst Ihres Gebäudes',
  } satisfies I18nField,

  description: {
    fr: "Depuis plus de 20 ans, BYB Bâtiment & Rénovation accompagne les particuliers et les professionnels dans tous leurs projets de construction, rénovation et entretien. Notre équipe de 15 artisans qualifiés intervient dans toute la région pour vous garantir des travaux soignés, dans les délais et dans le respect de votre budget.",
    en: 'For over 20 years, BYB has been supporting homeowners and businesses in all their construction, renovation and maintenance projects.',
    de: 'Seit über 20 Jahren begleitet BYB Privatpersonen und Unternehmen bei all ihren Bau-, Renovierungs- und Wartungsprojekten.',
  } satisfies I18nField,

  contact: {
    address: {
      street: '12 Rue des Artisans',
      city: 'Lyon',
      postalCode: '69001',
      country: 'France',
    },
    phone: '+33 4 00 00 00 00',       // à remplacer
    mobile: '+33 6 00 00 00 00',      // à remplacer
    email: 'contact@byb-batiment.fr', // à remplacer
    website: 'https://byb-batiment.fr',
  },

  socialLinks: {
    facebook: 'https://facebook.com/bybbatiment',   // à remplacer
    instagram: 'https://instagram.com/bybbatiment', // à remplacer
    linkedin: null,
  },

  openingHours: {
    fr: 'Lundi – Vendredi : 8h00 – 18h00',
    en: 'Monday – Friday: 8:00 AM – 6:00 PM',
    de: 'Montag – Freitag: 8:00 – 18:00 Uhr',
  } satisfies I18nField,
} as const;