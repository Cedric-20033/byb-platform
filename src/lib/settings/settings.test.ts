// src/lib/settings/settings.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_BOOKING_POLICY } from '@/domain/booking/BookingPolicy';
import { normalizeCompanySettings } from '@/domain/settings/CompanySettingsRules';
import { settingsWith, validSettings } from '@/test/fixtures/companySettings';
import { buildDefaultCompanySettings } from './defaultCompanySettings';
import { toBookingPolicy } from './resolveBookingSettings';

describe('buildDefaultCompanySettings', () => {
  it('produit des réglages valides pour le domaine (repli utilisable tel quel)', () => {
    expect(() => normalizeCompanySettings(buildDefaultCompanySettings({}))).not.toThrow();
  });

  it('reprend la politique de réservation par défaut, en confirmation manuelle', () => {
    const { booking } = buildDefaultCompanySettings({});

    expect(toBookingPolicy(buildDefaultCompanySettings({}))).toEqual({ ...DEFAULT_BOOKING_POLICY, autoConfirm: false });
    expect(booking.confirmationMode).toBe('manual');
  });

  it('suit l\'ancienne variable d\'environnement pour le destinataire interne', () => {
    expect(buildDefaultCompanySettings({ ADMIN_NOTIFICATION_EMAIL: ' ops@byb.test ' }).adminNotificationEmail).toBe(
      'ops@byb.test',
    );
  });

  it('retombe sur l\'email de contact sans variable d\'environnement', () => {
    const settings = buildDefaultCompanySettings({});

    expect(settings.adminNotificationEmail).toBe(settings.email);
  });
});

describe('toBookingPolicy', () => {
  it('traduit les réglages en politique du domaine', () => {
    expect(toBookingPolicy(validSettings())).toEqual({
      minNoticeMinutes: 120,
      horizonDays: 90,
      maxUpcomingPerEmail: 3,
      autoConfirm: false,
    });
  });

  it('active la confirmation automatique en mode « auto »', () => {
    const settings = settingsWith({ booking: { ...validSettings().booking, confirmationMode: 'auto' } });

    expect(toBookingPolicy(settings).autoConfirm).toBe(true);
  });
});
