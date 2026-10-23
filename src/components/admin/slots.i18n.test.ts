// src/components/admin/slots.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;

type Messages = { admin: { slots: Record<string, unknown>; navbar: Record<string, unknown> } };

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

describe('traductions des créneaux et de la barre de navigation', () => {
  it.each(LOCALES)('%s possède exactement les mêmes clés admin.slots.* que le français', (locale) => {
    expect(flatten(load(locale).admin.slots).sort()).toEqual(flatten(load('fr').admin.slots).sort());
  });

  it.each(LOCALES)('%s possède exactement les mêmes clés admin.navbar.* que le français', (locale) => {
    expect(flatten(load(locale).admin.navbar).sort()).toEqual(flatten(load('fr').admin.navbar).sort());
  });

  it.each(['en', 'de'] as const)('%s : les textes de la gestion en lot ne contiennent aucun TODO_TRANSLATE', (locale) => {
    expect(JSON.stringify(load(locale).admin.slots.bulk)).not.toContain('TODO_TRANSLATE');
  });
});
