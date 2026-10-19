// src/components/admin/dashboard.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;

type Messages = { admin: { dashboard: Record<string, unknown> } };

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

describe('traductions du tableau de bord', () => {
  it.each(LOCALES)('%s possède exactement les mêmes clés admin.dashboard.* que le français', (locale) => {
    expect(flatten(load(locale).admin.dashboard).sort()).toEqual(flatten(load('fr').admin.dashboard).sort());
  });

  it.each(LOCALES)('%s : aucun TODO_TRANSLATE ni tiret long dans les textes visibles', (locale) => {
    const serialized = JSON.stringify(load(locale).admin.dashboard);

    expect(serialized).not.toContain('TODO_TRANSLATE');
    expect(serialized).not.toContain('\u2014');
  });
});
