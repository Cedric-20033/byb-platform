// src/data/content.test.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { company, getPrimarySite } from './company';
import { buildMapEmbedUrl, formatSiteAddress } from '@/lib/maps';

const ROOT = process.cwd();

/** Références propres à la France : le client est une entreprise belge. */
const FRENCH_ONLY_TERMS = /\b(Lyon|lyonnaise|Lyoner|Auvergne|Rhône-Alpes|SIRET|DTU|RGE|France)\b/i;

function readContentFiles(): { file: string; content: string }[] {
  const messagesDir = join(ROOT, 'messages');
  const dataDir = join(ROOT, 'src', 'data');

  const messages = readdirSync(messagesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(messagesDir, name));
  const data = readdirSync(dataDir)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => join(dataDir, name));

  return [...messages, ...data].map((file) => ({ file, content: readFileSync(file, 'utf8') }));
}

describe('contenu éditorial — client belge', () => {
  it.each(readContentFiles().map(({ file, content }) => [file, content]))(
    '%s ne contient aucune référence spécifique à la France',
    (_file, content) => {
      expect(content).not.toMatch(FRENCH_ONLY_TERMS);
    },
  );
});

describe('entreprise multi-sites', () => {
  it('déclare exactement un site principal', () => {
    expect(company.sites.filter((site) => site.isPrimary)).toHaveLength(1);
    expect(getPrimarySite().id).toBe('asselt');
  });

  it('utilise des identifiants de site uniques', () => {
    const ids = company.sites.map((site) => site.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('utilise des codes postaux belges (4 chiffres)', () => {
    for (const site of company.sites) {
      expect(site.address.postalCode).toMatch(/^\d{4}$/);
    }
  });

  it('construit une carte propre à chaque adresse (plus de coordonnées partagées)', () => {
    const urls = company.sites.map((site) => buildMapEmbedUrl(site, 'fr'));

    expect(new Set(urls).size).toBe(company.sites.length);
    expect(urls[1]).toContain(encodeURIComponent('Rue Vaudrée 66'));
  });

  it('formate l\'adresse dans la langue demandée', () => {
    expect(formatSiteAddress(getPrimarySite(), 'fr')).toBe('Koning Boudewijnlaan 20, 3500 Asselt, Belgique');
    expect(formatSiteAddress(getPrimarySite(), 'de')).toBe('Koning Boudewijnlaan 20, 3500 Asselt, Belgien');
  });
});
