// src/components/admin/settings/settingsFormValues.test.ts
import { describe, expect, it } from 'vitest';
import { companySettingsSchema } from '@/lib/validation/settings';
import { settingsWith, validSettings } from '@/test/fixtures/companySettings';
import { emptySiteValues, toSettingsFormValues, withoutSite, withPrimarySite } from './settingsFormValues';

const sites = () => [
  { id: 'a', isPrimary: true },
  { id: 'b', isPrimary: false },
  { id: 'c', isPrimary: false },
];

describe('toSettingsFormValues', () => {
  it('remplace les traductions absentes par des chaînes vides (inputs contrôlés)', () => {
    const values = toSettingsFormValues(validSettings());

    expect(values.openingHours).toEqual({ fr: 'Lundi au vendredi, 8h-18h', en: 'Monday to Friday, 8am-6pm', de: '' });
    expect(values.sites[1].country).toEqual({ fr: 'Belgique', en: '', de: '' });
  });

  it('produit des valeurs que le schéma du formulaire accepte', () => {
    expect(companySettingsSchema.safeParse(toSettingsFormValues(validSettings())).success).toBe(true);
  });
});

describe('withPrimarySite', () => {
  it('désigne exactement un site principal', () => {
    expect(withPrimarySite(sites(), 'c').map((s) => s.isPrimary)).toEqual([false, false, true]);
  });

  it('laisse la liste inchangée pour un identifiant inconnu', () => {
    expect(withPrimarySite(sites(), 'zzz')).toEqual(sites());
  });
});

describe('withoutSite', () => {
  it('retire un site non principal sans toucher au principal', () => {
    expect(withoutSite(sites(), 'b').map((s) => [s.id, s.isPrimary])).toEqual([['a', true], ['c', false]]);
  });

  it('réattribue le rôle de principal au premier site restant', () => {
    expect(withoutSite(sites(), 'a').map((s) => [s.id, s.isPrimary])).toEqual([['b', true], ['c', false]]);
  });

  it('renvoie une liste vide quand on retire le dernier site', () => {
    expect(withoutSite([{ id: 'a', isPrimary: true }], 'a')).toEqual([]);
  });
});

describe('emptySiteValues', () => {
  it('crée un site non principal, avec le pays en trois langues', () => {
    expect(emptySiteValues('x')).toMatchObject({ id: 'x', isPrimary: false, country: { fr: 'Belgique', en: 'Belgium', de: 'Belgien' } });
  });
});

describe('companySettingsSchema', () => {
  const parse = (overrides: Parameters<typeof settingsWith>[0]) =>
    companySettingsSchema.safeParse(toSettingsFormValues(settingsWith(overrides)));
  const firstMessage = (result: ReturnType<typeof parse>) => (result.success ? null : result.error.issues[0].message);

  it('renvoie des CLÉS de message, jamais des phrases', () => {
    expect(firstMessage(parse({ email: 'oups' }))).toBe('emailInvalid');
    expect(firstMessage(parse({ facebookUrl: 'facebook.com' }))).toBe('linkInvalid');
    expect(firstMessage(parse({ phone: 'abc' }))).toBe('phoneInvalid');
    expect(firstMessage(parse({ openingHours: { fr: '' } }))).toBe('frRequired');
  });

  it('accepte des coordonnées et des liens vides (lignes masquées sur le site)', () => {
    expect(parse({ phone: '', mobile: '', website: '', instagramUrl: '' }).success).toBe(true);
  });

  it('refuse une liste de sites sans exactement un principal', () => {
    const [first, second] = validSettings().sites;

    expect(firstMessage(parse({ sites: [{ ...first, isPrimary: false }, second] }))).toBe('sitesInvalid');
    expect(firstMessage(parse({ sites: [] }))).toBe('sitesInvalid');
  });

  it('refuse une durée de réservation hors bornes et une plage horaire inversée', () => {
    const booking = validSettings().booking;

    expect(firstMessage(parse({ booking: { ...booking, horizonDays: 0 } }))).toBe('rangeInvalid');
    expect(firstMessage(parse({ booking: { ...booking, defaultStartTime: '19:00' } }))).toBe('startTimeAfterEnd');
  });
});
