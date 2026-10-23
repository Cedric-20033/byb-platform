// src/lib/settings/publicCompanyInfo.test.ts
import { describe, expect, it } from 'vitest';
import { settingsWith, validSettings } from '@/test/fixtures/companySettings';
import { getPrimaryPublicSite, toPublicCompanyInfo } from './publicCompanyInfo';

describe('toPublicCompanyInfo', () => {
  it('n\'expose ni l\'email de notification interne ni les règles de réservation', () => {
    const serialized = JSON.stringify(toPublicCompanyInfo(validSettings()));

    expect(serialized).not.toContain('equipe@byb.test');
    expect(serialized).not.toContain('minNotice');
    expect(serialized).not.toContain('booking');
  });

  it('remplit les langues non renseignées avec le français', () => {
    const info = toPublicCompanyInfo(validSettings());

    expect(info.openingHours).toEqual({
      fr: 'Lundi au vendredi, 8h-18h',
      en: 'Monday to Friday, 8am-6pm',
      de: 'Lundi au vendredi, 8h-18h',
    });
    expect(info.sites[1].address.country).toEqual({ fr: 'Belgique', en: 'Belgique', de: 'Belgique' });
  });

  it('transforme un lien vide en null (lien masqué) et garde les liens renseignés', () => {
    const { socialLinks } = toPublicCompanyInfo(validSettings());

    expect(socialLinks).toEqual({ facebook: null, instagram: 'https://instagram.com/byb', linkedin: null });
  });

  it('range les sites dans la forme historique (adresse imbriquée)', () => {
    const [asselt] = toPublicCompanyInfo(validSettings()).sites;

    expect(asselt).toMatchObject({
      id: 'asselt',
      name: 'Asselt',
      isPrimary: true,
      address: { street: 'Koning Boudewijnlaan 20', postalCode: '3500', city: 'Hasselt' },
    });
  });

  it('utilise le mobile saisi pour WhatsApp', () => {
    expect(toPublicCompanyInfo(validSettings()).contact.whatsapp).toBe('+32 465 71 19 09');
  });
});

describe('getPrimaryPublicSite', () => {
  it('renvoie le site principal, même s\'il n\'est pas le premier', () => {
    const [first, second] = validSettings().sites;
    const info = toPublicCompanyInfo(settingsWith({ sites: [{ ...first, isPrimary: false }, { ...second, isPrimary: true }] }));

    expect(getPrimaryPublicSite(info).id).toBe('liege');
  });
});
