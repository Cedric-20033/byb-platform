// src/components/admin/users.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;

type Messages = { admin: { users: Record<string, unknown> } };

function load(locale: string): Messages {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));
}

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? flatten(child as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('traductions de la page Utilisateurs', () => {
  const reference = flatten(load('fr').admin.users).sort();

  it.each(LOCALES)('%s possède exactement les mêmes clés admin.users.* que le français', (locale) => {
    expect(flatten(load(locale).admin.users).sort()).toEqual(reference);
  });
});
