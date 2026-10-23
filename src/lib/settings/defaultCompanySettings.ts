// src/lib/settings/defaultCompanySettings.ts
import { company } from '@/data/company';
import { DEFAULT_BOOKING_POLICY } from '@/domain/booking/BookingPolicy';
import type { CompanySettings } from '@/domain/settings/CompanySettings';

/**
 * Réglages de repli : les valeurs actuelles du site (`data/company.ts`) et la politique de réservation
 * par défaut. Ils servent tant que rien n'a été enregistré depuis /dashboard/settings, et de filet si la
 * base est injoignable : le site public et la réservation ne tombent jamais faute de réglages.
 *
 * L'email de notification suit l'ancienne variable d'environnement, pour que la bascule vers les réglages
 * ne change le destinataire de personne.
 */
export function buildDefaultCompanySettings(
  env: { ADMIN_NOTIFICATION_EMAIL?: string } = {
    ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL,
  },
): CompanySettings {
  return {
    phone: company.contact.phone,
    mobile: company.contact.mobile,
    email: company.contact.email,
    website: company.contact.website,
    facebookUrl: company.socialLinks.facebook ?? '',
    instagramUrl: company.socialLinks.instagram ?? '',
    linkedinUrl: company.socialLinks.linkedin ?? '',
    openingHours: { ...company.openingHours },
    sites: company.sites.map((site) => ({
      id: site.id,
      name: site.name,
      isPrimary: site.isPrimary,
      street: site.address.street,
      postalCode: site.address.postalCode,
      city: site.address.city,
      country: { ...site.address.country },
    })),
    adminNotificationEmail: env.ADMIN_NOTIFICATION_EMAIL?.trim() || company.contact.email,
    booking: {
      minNoticeMinutes: DEFAULT_BOOKING_POLICY.minNoticeMinutes,
      horizonDays: DEFAULT_BOOKING_POLICY.horizonDays,
      maxUpcomingPerEmail: DEFAULT_BOOKING_POLICY.maxUpcomingPerEmail,
      confirmationMode: 'manual',
      defaultSlotMinutes: 60,
      defaultStartTime: '08:00',
      defaultEndTime: '18:00',
    },
  };
}
