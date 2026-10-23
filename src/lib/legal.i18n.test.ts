// src/lib/legal.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;
const NAMESPACES = ['legal', 'privacy'] as const;

type Messages = Record<string, unknown>;

const load = (locale: string): Messages =>
  JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));

/** « a.b.c » → valeur, pour toutes les feuilles de l'arbre. */
function leaves(value: unknown, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  if (typeof value === 'string') return result.set(prefix, value);
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      for (const [path, text] of leaves(child, prefix ? `${prefix}.${key}` : key)) result.set(path, text);
    }
  }
  return result;
}

/** Variables ICU `{x}` ou `{x, plural, …}`, balises riches `<link>` : tout ce qui doit survivre à la traduction. */
const variables = (text: string) => [...text.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]).sort();
const tags = (text: string) => [...text.matchAll(/<(\w+)>/g)].map((match) => match[1]).sort();

describe.each(NAMESPACES)('traductions juridiques « %s »', (namespace) => {
  const french = leaves(load('fr')[namespace]);

  it.each(LOCALES)('%s : mêmes clés que le français', (locale) => {
    expect([...leaves(load(locale)[namespace]).keys()].sort()).toEqual([...french.keys()].sort());
  });

  it.each(LOCALES)('%s : mêmes variables {…} et mêmes balises <…> que le français, clé par clé', (locale) => {
    const translated = leaves(load(locale)[namespace]);

    for (const [key, frenchText] of french) {
      const text = translated.get(key) ?? '';
      expect(variables(text), `${namespace}.${key}`).toEqual(variables(frenchText));
      expect(tags(text), `${namespace}.${key}`).toEqual(tags(frenchText));
    }
  });

  it.each(LOCALES)('%s : aucune valeur vide, aucun TODO_TRANSLATE, aucun tiret long', (locale) => {
    for (const [key, text] of leaves(load(locale)[namespace])) {
      expect(text.trim(), `${namespace}.${key}`).not.toBe('');
      expect(text, `${namespace}.${key}`).not.toContain('TODO_TRANSLATE');
      expect(text, `${namespace}.${key}`).not.toContain('\u2014');
    }
  });
});

describe('textes qui contiennent un lien vers la politique de confidentialité', () => {
  const KEYS = [
    ['legal', 'personalData.text'],
    ['contact', 'form.privacyNotice'],
    ['booking', 'confirmation.privacyNotice'],
  ] as const;

  it.each(KEYS)('%s.%s porte la balise <link> dans les trois langues', (namespace, key) => {
    for (const locale of LOCALES) {
      const text = leaves(load(locale)[namespace]).get(key) ?? '';

      expect(text, `${locale}:${namespace}.${key}`).toMatch(/<link>[^<]+<\/link>/);
    }
  });
});

describe('politique de confidentialité : durées annoncées', () => {
  it.each(LOCALES)('%s : annonce la suppression des compteurs de sécurité au bout de 24 heures', (locale) => {
    const text = leaves(load(locale).privacy).get('retention.security') ?? '';

    // 24 h = durée appliquée par la fonction SQL `purge_rate_limit_events` (migration 0018).
    expect(text).toMatch(/24/);
  });

  it.each(LOCALES)('%s : deux formulations de la durée des rendez-vous (durée connue ou non)', (locale) => {
    const retention = leaves(load(locale).privacy);

    expect(retention.get('retention.appointments')).toMatch(/\{months, plural,/);
    expect(retention.get('retention.appointmentsUnset')).not.toMatch(/\{months/);
  });
});
