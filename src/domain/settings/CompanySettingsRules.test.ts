// src/domain/settings/CompanySettingsRules.test.ts
import { describe, expect, it } from 'vitest';
import { settingsWith, validSettings } from '@/test/fixtures/companySettings';
import { changedSettingsFields, normalizeCompanySettings } from './CompanySettingsRules';

const normalize = (overrides: Parameters<typeof settingsWith>[0]) => () => normalizeCompanySettings(settingsWith(overrides));
const invalid = expect.objectContaining({ code: 'SETTINGS_INVALID' });

describe('normalizeCompanySettings', () => {
  it('accepte des réglages valides et les renvoie à l\'identique', () => {
    expect(normalizeCompanySettings(validSettings())).toEqual(validSettings());
  });

  it('retire les espaces et met les emails en minuscules', () => {
    const result = normalizeCompanySettings(
      settingsWith({ phone: '  +32 400 00 00 00 ', email: '  Contact@BYB.test ', adminNotificationEmail: ' Equipe@byb.test' }),
    );

    expect(result.phone).toBe('+32 400 00 00 00');
    expect(result.email).toBe('contact@byb.test');
    expect(result.adminNotificationEmail).toBe('equipe@byb.test');
  });

  it('retire les traductions vides des textes traduisibles', () => {
    const result = normalizeCompanySettings(settingsWith({ openingHours: { fr: 'Lu-Ve', en: '  ', de: '' } }));

    expect(result.openingHours).toEqual({ fr: 'Lu-Ve' });
  });

  it('exige les horaires en français', () => {
    expect(normalize({ openingHours: { fr: ' ', en: 'Mon-Fri' } })).toThrowError(
      expect.objectContaining({ code: 'TRANSLATION_FR_REQUIRED' }),
    );
  });

  it.each(['pas-un-email', 'a@b', '@byb.test', ''])('refuse l\'email de notification %j', (email) => {
    expect(normalize({ adminNotificationEmail: email })).toThrowError(invalid);
  });

  it('accepte un lien vide (masqué) ou une URL http(s), refuse le reste', () => {
    expect(normalize({ facebookUrl: '' })).not.toThrow();
    expect(normalize({ facebookUrl: 'http://facebook.com/byb' })).not.toThrow();
    expect(normalize({ facebookUrl: 'facebook.com/byb' })).toThrowError(invalid);
    expect(normalize({ linkedinUrl: 'javascript:alert(1)' })).toThrowError(invalid);
  });

  describe('sites', () => {
    const [asselt, liege] = validSettings().sites;

    it('exige au moins un site', () => {
      expect(normalize({ sites: [] })).toThrowError(invalid);
    });

    it('refuse plus de cinq sites', () => {
      const sites = Array.from({ length: 6 }, (_, i) => ({ ...asselt, id: `s${i}`, isPrimary: i === 0 }));
      expect(normalize({ sites })).toThrowError(invalid);
    });

    it('exige exactement un site principal', () => {
      expect(normalize({ sites: [{ ...asselt, isPrimary: false }, liege] })).toThrowError(invalid);
      expect(normalize({ sites: [asselt, { ...liege, isPrimary: true }] })).toThrowError(invalid);
    });

    it('refuse des identifiants en double', () => {
      expect(normalize({ sites: [asselt, { ...liege, id: asselt.id }] })).toThrowError(invalid);
    });

    it('exige nom, rue, code postal et ville', () => {
      expect(normalize({ sites: [{ ...asselt, street: ' ' }] })).toThrowError(invalid);
      expect(normalize({ sites: [{ ...asselt, city: '' }] })).toThrowError(invalid);
    });

    it('exige le pays en français', () => {
      expect(normalize({ sites: [{ ...asselt, country: { fr: '' } }] })).toThrowError(
        expect.objectContaining({ code: 'TRANSLATION_FR_REQUIRED' }),
      );
    });
  });

  describe('réservation', () => {
    const booking = validSettings().booking;
    const withBooking = (override: Partial<typeof booking>) => normalize({ booking: { ...booking, ...override } });

    it.each([
      ['minNoticeMinutes', -1],
      ['minNoticeMinutes', 10_081],
      ['horizonDays', 0],
      ['horizonDays', 366],
      ['maxUpcomingPerEmail', 0],
      ['maxUpcomingPerEmail', 21],
      ['defaultSlotMinutes', 14],
      ['defaultSlotMinutes', 481],
      ['horizonDays', 1.5],
    ] as const)('refuse %s = %s', (field, value) => {
      expect(withBooking({ [field]: value })).toThrowError(invalid);
    });

    it('accepte les bornes exactes', () => {
      expect(withBooking({ minNoticeMinutes: 0, horizonDays: 1, maxUpcomingPerEmail: 1, defaultSlotMinutes: 15 })).not.toThrow();
      expect(
        withBooking({ minNoticeMinutes: 10_080, horizonDays: 365, maxUpcomingPerEmail: 20, defaultSlotMinutes: 480 }),
      ).not.toThrow();
    });

    it('refuse un mode de confirmation inconnu', () => {
      expect(withBooking({ confirmationMode: 'maybe' as never })).toThrowError(invalid);
    });

    it.each([['8h00', '18:00'], ['08:00', '24:00'], ['18:00', '08:00'], ['08:00', '08:00']])(
      'refuse la plage %s → %s',
      (defaultStartTime, defaultEndTime) => {
        expect(withBooking({ defaultStartTime, defaultEndTime })).toThrowError(invalid);
      },
    );
  });
});

describe('changedSettingsFields', () => {
  it('ne signale rien quand rien ne change', () => {
    expect(changedSettingsFields(validSettings(), validSettings())).toEqual([]);
  });

  it('nomme les champs modifiés, sans leur contenu', () => {
    const after = settingsWith({ phone: '+32 400 00 00 00', booking: { ...validSettings().booking, horizonDays: 30 } });

    expect(changedSettingsFields(validSettings(), after)).toEqual(['phone', 'booking.horizonDays']);
  });

  it('détecte un changement dans les sites ou les textes traduisibles', () => {
    const after = settingsWith({ openingHours: { fr: 'Autre' }, sites: [validSettings().sites[0]] });

    expect(changedSettingsFields(validSettings(), after)).toEqual(['openingHours', 'sites']);
  });
});
