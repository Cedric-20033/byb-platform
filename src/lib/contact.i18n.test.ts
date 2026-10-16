// src/lib/contact.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;

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

describe('traductions de la page contact', () => {
  const french = leaves(load('fr').contact);

  it.each(LOCALES)('%s : mêmes clés contact.* que le français', (locale) => {
    expect([...leaves(load(locale).contact).keys()].sort()).toEqual([...french.keys()].sort());
  });

  it.each(LOCALES)('%s : mêmes variables {…} que le français, clé par clé', (locale) => {
    const translated = leaves(load(locale).contact);

    for (const [key, frenchText] of french) {
      expect(placeholders(translated.get(key) ?? ''), `contact.${key}`).toEqual(placeholders(frenchText));
    }
  });

  it.each(LOCALES)('%s : aucune valeur vide ni TODO_TRANSLATE', (locale) => {
    for (const [key, text] of leaves(load(locale).contact)) {
      expect(text.trim(), `contact.${key}`).not.toBe('');
      expect(text, `contact.${key}`).not.toContain('TODO_TRANSLATE');
    }
  });

  it.each(LOCALES)('%s : la page porte les textes de référencement et du formulaire', (locale) => {
    const contact = load(locale).contact as Messages;
    const form = contact.form as Messages;

    for (const key of ['title', 'subtitle', 'metaDescription']) expect(contact[key], key).toBeTruthy();
    for (const key of ['firstName', 'lastName', 'email', 'phone', 'subject', 'message', 'submit', 'sending', 'successTitle', 'successMessage', 'privacyNotice', 'captchaLoadError']) {
      expect(form[key], `form.${key}`).toBeTruthy();
    }
  });
});
