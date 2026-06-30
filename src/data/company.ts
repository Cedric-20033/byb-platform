// src/data/company.ts
import type { I18nField } from "@/lib/utils";

/**
 * Informations de l'entreprise cliente.
 * Source de vérité jusqu'à la migration vers Supabase.
 *
 * À REMPLACER par les vraies données client dès réception.
 */
export const company = {
  name: "BYB CONSTRUCTION",
  fullName: "BYB Construction — Construction générale",
  legalForm: "", // non fourni par le client — à compléter
  siret: "", // non applicable (société belge, voir champ "tva")
  tva: "BE1013632677",
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

  contact: {
    // Siège principal. L'entreprise dispose d'un second site à Liège
    // (Rue Vaudrée 66, 4031 Liège) — non modélisé ici car la structure
    // actuelle ne prévoit qu'une seule adresse. À étendre en multi-sites
    // si le client le confirme (cf. note transmise à l'équipe).
    address: {
      street: "Koning Boudewijnlaan 20",
      city: "Asselt",
      postalCode: "3500",
      country: "Belgique",
    },
    mapEmbedUrl: {
      asselt: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2510.905187168775!2d5.395091276042479!3d51.05388217956986!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c0e7a8b9e6c6b5%3A0x7e8b8c8c8c8c8c8c!2sKoning%20Boudewijnlaan%2020%2C%203500%20Asselt%2C%20Belgique!5e0!3m2!1sfr!2sbe!4v1697040000000",
      liege: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2510.905187168775!2d5.395091276042479!3d51.05388217956986!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c0e7a8b9e6c6b5%3A0x7e8b8c8c8c8c8c8c!2sRue%20Vaudrée%2066%2C%204031%20Liège%2C%20Belgique!5e0!3m2!1sfr!2sbe!4v1697040000000",
    },
    phone: "+32 471 54 81 63",
    mobile: "+32 465 71 19 09",
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
