// src/test/fixtures/companySettings.ts
import type { CompanySettings } from '@/domain/settings/CompanySettings';

/** Réglages valides de référence ; les tests en dérivent des variantes avec `settingsWith`. */
export function validSettings(): CompanySettings {
  return {
    phone: '+32 471 54 81 63',
    mobile: '+32 465 71 19 09',
    email: 'contact@byb.test',
    website: 'https://byb.test',
    facebookUrl: '',
    instagramUrl: 'https://instagram.com/byb',
    linkedinUrl: '',
    openingHours: { fr: 'Lundi au vendredi, 8h-18h', en: 'Monday to Friday, 8am-6pm' },
    sites: [
      {
        id: 'asselt',
        name: 'Asselt',
        isPrimary: true,
        street: 'Koning Boudewijnlaan 20',
        postalCode: '3500',
        city: 'Hasselt',
        country: { fr: 'Belgique', en: 'Belgium', de: 'Belgien' },
      },
      {
        id: 'liege',
        name: 'Liège',
        isPrimary: false,
        street: 'Rue Vaudrée 66',
        postalCode: '4031',
        city: 'Angleur',
        country: { fr: 'Belgique' },
      },
    ],
    adminNotificationEmail: 'equipe@byb.test',
    booking: {
      minNoticeMinutes: 120,
      horizonDays: 90,
      maxUpcomingPerEmail: 3,
      confirmationMode: 'manual',
      defaultSlotMinutes: 60,
      defaultStartTime: '08:00',
      defaultEndTime: '18:00',
    },
  };
}

/** Variante des réglages de référence (fusion superficielle ; `booking` se remplace en bloc). */
export function settingsWith(overrides: Partial<CompanySettings>): CompanySettings {
  return { ...validSettings(), ...overrides };
}
