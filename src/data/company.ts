// src/data/company.ts
import type { I18nField } from "@/lib/utils";

/**
 * Un site (adresse physique) de l'entreprise.
 * Format brut, directement mappable sur une table Supabase `company_sites`
 * (étape P6.4 : paramètres éditables depuis le dashboard).
 */
export type CompanySite = {
  /** Identifiant stable (slug), utilisé comme clé React et pour les ancres. */
  id: string;
  /** Nom affiché — nom propre, volontairement non traduit. */
  name: string;
  /** Le siège : source de l'adresse "principale" (footer, mentions légales, JSON-LD). */
  isPrimary: boolean;
  address: {
    street: string;
    postalCode: string;
    city: string;
    country: I18nField;
  };
};

const belgium = {
  fr: "Belgique",
  en: "Belgium",
  de: "Belgien",
} satisfies I18nField;

const sites: readonly CompanySite[] = [
  {
    id: "asselt",
    name: "BYB Asselt",
    isPrimary: true,
    address: {
      street: "Koning Boudewijnlaan 20",
      postalCode: "3500",
      city: "Asselt",
      country: belgium,
    },
  },
  {
    id: "liege",
    name: "BYB Liège",
    isPrimary: false,
    address: {
      street: "Rue Vaudrée 66",
      postalCode: "4031",
      city: "Liège",
      country: belgium,
    },
  },
];

/**
 * Informations de l'entreprise cliente.
 * Source de vérité jusqu'à la migration vers Supabase.
 *
 * À REMPLACER par les vraies données client dès réception.
 */
export const company = {
  name: "BYB CONSTRUCTION",
  fullName: "BYB Construction — Construction générale",
  legalForm: "", // non fourni par le client — à compléter (ex. SRL)
  tva: "BE1013632677", // numéro de TVA belge (identique au numéro d'entreprise BCE)
  foundedYear: 2005, // non fourni — à confirmer avec le client

  slogan: {
    fr: "L'excellence au service de votre bâtiment",
    en: "Excellence at the service of your building",
    de: "Exzellenz im Dienst Ihres Gebäudes",
  } satisfies I18nField,

  description: {
    fr: "Depuis plus de 20 ans, BYB Construction accompagne les particuliers et les professionnels dans tous leurs projets de construction générale, rénovation et entretien. Notre équipe d'artisans qualifiés intervient en Belgique pour vous garantir des travaux soignés, dans les délais et dans le respect de votre budget.",
    en: "For over 20 years, BYB has been supporting homeowners and businesses in all their construction, renovation and maintenance projects.",
    de: "Seit über 20 Jahren begleitet BYB Privatpersonen und Unternehmen bei all ihren Bau-, Renovierungs- und Wartungsprojekten.",
  } satisfies I18nField,

  sites,

  contact: {
    phone: "+32 471 54 81 63",
    mobile: "+32 465 71 19 09",
    // Numero dedie au bouton WhatsApp flottant — distinct de `mobile` pour
    // permettre au client de brancher une ligne WhatsApp Business dediee
    // plus tard sans toucher au numero de contact affiche ailleurs sur le site.
    whatsapp: "+32 465 71 19 09",
    email: "bybconstruction2@gmail.com",
    website: "", // non fourni
  },

  socialLinks: {
    facebook: null, // non fourni
    instagram: null, // non fourni
    linkedin: null,
  },

  openingHours: {
    fr: "Lundi – Vendredi : 8h00 – 18h00",
    en: "Monday – Friday: 8:00 AM – 6:00 PM",
    de: "Montag – Freitag: 8:00 – 18:00 Uhr",
  } satisfies I18nField,
} as const;

/** Siège de l'entreprise (repli sur le premier site si aucun n'est marqué principal). */
export function getPrimarySite(): CompanySite {
  return company.sites.find((site) => site.isPrimary) ?? company.sites[0];
}
