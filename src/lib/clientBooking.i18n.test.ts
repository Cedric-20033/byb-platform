// src/lib/clientBooking.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;
const NAMESPACES = ['booking', 'clientAppointment', 'emails'] as const;

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

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe.each(NAMESPACES)('traductions « %s »', (namespace) => {
  const french = leaves(load('fr')[namespace]);

  it.each(LOCALES)('%s : mêmes clés que le français', (locale) => {
    expect([...leaves(load(locale)[namespace]).keys()].sort()).toEqual([...french.keys()].sort());
  });

  it.each(LOCALES)('%s : mêmes variables {…} que le français, clé par clé', (locale) => {
    const translated = leaves(load(locale)[namespace]);

    for (const [key, frenchText] of french) {
      expect(placeholders(translated.get(key) ?? ''), `${namespace}.${key}`).toEqual(placeholders(frenchText));
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

describe('gabarits d\'email', () => {
  const required = ['subject', 'preview', 'heading', 'intro'];
  const templates = Object.keys(load('fr').emails as Messages).filter((key) => key !== 'common');

  it.each(LOCALES)('%s : chaque gabarit définit objet, aperçu, titre et introduction', (locale) => {
    const emails = load(locale).emails as Record<string, Messages>;

    for (const template of templates) {
      expect(Object.keys(emails[template]).sort(), template).toEqual([...required].sort());
    }
  });
});
