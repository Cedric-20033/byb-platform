// src/data/legal.ts
import type { I18nField } from "@/lib/utils";
import { company } from "./company";

/**
 * Informations légales du site (mentions légales, politique de confidentialité).
 *
 * Même principe que `company.ts` : format brut, mappable sur une table Supabase (P6.4). Une valeur `null` signifie
 * « le client ne l'a pas fournie » : la page concernée n'affiche alors RIEN à sa place plutôt qu'une information
 * inventée ou un trou. Les lacunes à combler sont listées dans docs/RGPD.md.
 */

/** Date de la dernière révision du texte de la politique de confidentialité (AAAA-MM-JJ). À mettre à jour à chaque révision. */
export const PRIVACY_POLICY_UPDATED_AT = "2026-10-15";

/** Autorité belge de contrôle, auprès de laquelle toute personne peut introduire une réclamation. */
export const dataProtectionAuthority = {
  name: {
    fr: "Autorité de protection des données (APD)",
    en: "Belgian Data Protection Authority (DPA)",
    de: "Datenschutzbehörde (APD)",
  } satisfies I18nField,
  address: "Rue de la Presse 35, 1000 Bruxelles",
  website: "https://www.autoriteprotectiondonnees.be",
  email: "contact@apd-gba.be",
} as const;

export type LegalEntity = {
  name: string;
  address: string;
  website: string;
};

/**
 * Sous-traitants qui reçoivent des données de visiteurs. L'identifiant sert de clé de traduction
 * (`privacy.processors.<id>`) pour la finalité de chacun.
 */
export const dataProcessors = [
  { id: "supabase", name: "Supabase" },
  { id: "resend", name: "Resend" },
  { id: "cloudinary", name: "Cloudinary" },
  { id: "cloudflare", name: "Cloudflare" },
  { id: "google", name: "Google" },
] as const;

export const legal = {
  /**
   * Hébergeur du site. NON FOURNI : l'hébergement n'est pas arrêté (CLAUDE.md, P11.2). Une mention d'hébergeur n'est
   * pas exigée par le droit belge, mais si elle est affichée elle doit être exacte.
   */
  host: null as LegalEntity | null,

  /** Entité de médiation ou de règlement extrajudiciaire des litiges. NON FOURNIE : à décider avec le client. */
  mediation: null as LegalEntity | null,

  retention: {
    /**
     * Mois écoulés après un rendez-vous avant anonymisation. NON VALIDÉE avec le client : `null` tant qu'elle ne l'est pas.
     * Doit rester identique à `data_retention_policy.appointment_retention_months` en base (migration 0018) : la
     * politique de confidentialité annonce ce que la tâche planifiée applique réellement.
     */
    appointmentsMonths: null as number | null,
  },
};

/** Dénomination complète : le nom, suivi de la forme juridique quand elle est connue. */
export function getLegalCompanyName(): string {
  return company.legalForm ? `${company.name} ${company.legalForm}` : company.name;
}
