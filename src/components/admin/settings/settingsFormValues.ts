// src/components/admin/settings/settingsFormValues.ts
import type { CompanySettings } from '@/domain/settings/CompanySettings';
import type { CompanySettingsFormValues } from '@/lib/validation/settings';

/** Réglages → valeurs de formulaire : les traductions absentes deviennent des champs vides (inputs contrôlés). */
export function toSettingsFormValues(settings: CompanySettings): CompanySettingsFormValues {
  return {
    ...settings,
    openingHours: {
      fr: settings.openingHours.fr,
      en: settings.openingHours.en ?? '',
      de: settings.openingHours.de ?? '',
    },
    sites: settings.sites.map((site) => ({
      ...site,
      country: { fr: site.country.fr, en: site.country.en ?? '', de: site.country.de ?? '' },
    })),
    booking: { ...settings.booking },
  };
}

/** Site vierge ajouté depuis le formulaire. Jamais principal : le principal existant reste celui du site public. */
export function emptySiteValues(id: string): CompanySettingsFormValues['sites'][number] {
  return {
    id,
    name: '',
    isPrimary: false,
    street: '',
    postalCode: '',
    city: '',
    country: { fr: 'Belgique', en: 'Belgium', de: 'Belgien' },
  };
}

/**
 * Change le site principal : exactement un site l'est. Fonction pure, testable sans rendu.
 * Un identifiant inconnu laisse la liste inchangée (jamais « zéro principal »).
 */
export function withPrimarySite<T extends { id: string; isPrimary: boolean }>(sites: T[], primaryId: string): T[] {
  if (!sites.some((site) => site.id === primaryId)) return sites;
  return sites.map((site) => ({ ...site, isPrimary: site.id === primaryId }));
}

/**
 * Retire un site. Si c'était le principal, le premier site restant le devient : la liste garde toujours
 * un principal, sans quoi le formulaire serait invalide sans que l'utilisateur sache pourquoi.
 */
export function withoutSite<T extends { id: string; isPrimary: boolean }>(sites: T[], id: string): T[] {
  const remaining = sites.filter((site) => site.id !== id);
  if (remaining.length === 0 || remaining.some((site) => site.isPrimary)) return remaining;
  return remaining.map((site, index) => ({ ...site, isPrimary: index === 0 }));
}
