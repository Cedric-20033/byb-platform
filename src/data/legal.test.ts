// src/data/legal.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRIVACY_POLICY_UPDATED_AT, dataProcessors, dataProtectionAuthority, getLegalCompanyName, legal } from './legal';

const LOCALES = ['fr', 'en', 'de'] as const;
const load = (locale: string) => JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));

describe('données légales', () => {
  it('annonce la date de révision de la politique au format AAAA-MM-JJ', () => {
    expect(PRIVACY_POLICY_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(PRIVACY_POLICY_UPDATED_AT))).toBe(false);
  });

  it('désigne l\'autorité belge de protection des données, dans les trois langues', () => {
    for (const locale of LOCALES) expect(dataProtectionAuthority.name[locale]).toBeTruthy();
    expect(dataProtectionAuthority.website).toMatch(/^https:\/\//);
    expect(dataProtectionAuthority.email).toContain('@');
  });

  it('ne présente que des informations fournies : une donnée manquante est null, jamais un texte inventé', () => {
    for (const value of [legal.host, legal.mediation, legal.retention.appointmentsMonths]) {
      expect(value === null || (typeof value === 'object' ? Object.values(value).every(Boolean) : value > 0)).toBe(true);
    }
  });

  it('une durée de conservation renseignée est un nombre de mois entier et raisonnable', () => {
    const months = legal.retention.appointmentsMonths;

    if (months !== null) {
      expect(Number.isInteger(months)).toBe(true);
      // Mêmes bornes que la contrainte de la table data_retention_policy (migration 0018).
      expect(months).toBeGreaterThanOrEqual(1);
      expect(months).toBeLessThanOrEqual(120);
    }
  });
});

describe('sous-traitants', () => {
  it('chacun a un identifiant unique et un nom', () => {
    const ids = dataProcessors.map((processor) => processor.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const processor of dataProcessors) expect(processor.name).toBeTruthy();
  });

  it.each(LOCALES)('%s : chacun a sa finalité décrite dans la politique de confidentialité', (locale) => {
    const processors = load(locale).privacy.processors as Record<string, string>;

    for (const { id } of dataProcessors) expect(processors[id]?.trim(), `privacy.processors.${id}`).toBeTruthy();
  });
});

describe('getLegalCompanyName', () => {
  it('renvoie la dénomination, sans forme juridique tant que le client ne l\'a pas fournie', () => {
    const name = getLegalCompanyName();

    expect(name.startsWith('BYB CONSTRUCTION')).toBe(true);
  });
});
