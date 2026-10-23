// src/lib/auth/auth.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VALIDATION_MESSAGE_KEYS } from '@/lib/validation/messages';

const LOCALES = ['fr', 'en', 'de'] as const;

type Messages = { auth: Record<string, unknown>; errors: { validation: Record<string, string> } };

function load(locale: string): Messages {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));
}

/** Aplatit un objet imbriqué en chemins pointés (`forgot.title`) pour comparer les clés. */
function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? flatten(child as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('traductions des écrans d\'authentification', () => {
  const reference = flatten(load('fr').auth).sort();

  it.each(LOCALES)('%s possède exactement les mêmes clés auth.* que le français', (locale) => {
    expect(flatten(load(locale).auth).sort()).toEqual(reference);
  });

  it.each(LOCALES)('%s traduit chaque clé de validation déclarée', (locale) => {
    expect(Object.keys(load(locale).errors.validation).sort()).toEqual([...VALIDATION_MESSAGE_KEYS].sort());
  });
});
