// src/lib/settings/publicCompanyInfo.ts
import { cache } from 'react';
import type { CompanySite } from '@/data/company';
import type { CompanySettings } from '@/domain/settings/CompanySettings';
import { GetCompanySettings } from '@/application/settings/GetCompanySettings';
import { SupabaseCompanySettingsRepository } from '@/infrastructure/supabase/repositories/SupabaseCompanySettingsRepository';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { buildDefaultCompanySettings } from './defaultCompanySettings';

type Localized = Record<'fr' | 'en' | 'de', string>;

/**
 * Ce que le site public affiche de l'entreprise : forme historique de `data/company.ts` (les composants
 * d'affichage n'ont pas changé de contrat), SANS l'email de notification interne ni les règles de
 * réservation. Cette valeur est passée à des composants client : elle ne doit contenir aucun secret.
 */
export type PublicCompanyInfo = {
  contact: { phone: string; mobile: string; whatsapp: string; email: string; website: string };
  socialLinks: { facebook: string | null; instagram: string | null; linkedin: string | null };
  openingHours: Localized;
  sites: CompanySite[];
};

/** Texte traduisible complet : une langue non renseignée affiche le français, comme partout sur le site. */
function toLocalized(text: { fr: string; en?: string; de?: string }): Localized {
  return { fr: text.fr, en: text.en || text.fr, de: text.de || text.fr };
}

/** Chaîne vide (« non renseigné » dans les réglages) → `null`, la valeur que les composants testent pour masquer un lien. */
const orNull = (value: string): string | null => value || null;

export function toPublicCompanyInfo(settings: CompanySettings): PublicCompanyInfo {
  return {
    contact: {
      phone: settings.phone,
      mobile: settings.mobile,
      // Un seul numéro mobile saisi : c'est aussi celui de WhatsApp.
      whatsapp: settings.mobile,
      email: settings.email,
      website: settings.website,
    },
    socialLinks: {
      facebook: orNull(settings.facebookUrl),
      instagram: orNull(settings.instagramUrl),
      linkedin: orNull(settings.linkedinUrl),
    },
    openingHours: toLocalized(settings.openingHours),
    sites: settings.sites.map((site) => ({
      id: site.id,
      name: site.name,
      isPrimary: site.isPrimary,
      address: {
        street: site.street,
        postalCode: site.postalCode,
        city: site.city,
        country: toLocalized(site.country),
      },
    })),
  };
}

/** Site principal : celui que le site public met en avant (mentions légales, carte). */
export function getPrimaryPublicSite(info: PublicCompanyInfo): CompanySite {
  return info.sites.find((site) => site.isPrimary) ?? info.sites[0];
}

/**
 * Lecture serveur des informations publiques, dédupliquée par requête (`cache`) : le chrome du site et la
 * page la demandent tous deux sans double lecture. Client service_role : la table n'a pas de lecture publique.
 * Une base illisible ne doit jamais faire tomber une page publique : repli sur `data/company.ts`.
 */
export const loadPublicCompanyInfo = cache(async (): Promise<PublicCompanyInfo> => {
  const fallback = buildDefaultCompanySettings();

  try {
    const settings = await new GetCompanySettings(
      new SupabaseCompanySettingsRepository(createServiceRoleClient()),
      fallback,
    ).execute();
    return toPublicCompanyInfo(settings);
  } catch (error) {
    console.error('[loadPublicCompanyInfo] Réglages illisibles, valeurs par défaut utilisées :', error);
    return toPublicCompanyInfo(fallback);
  }
});
