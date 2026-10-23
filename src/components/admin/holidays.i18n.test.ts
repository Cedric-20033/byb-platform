// src/components/admin/holidays.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BELGIAN_HOLIDAY_KEYS } from '@/domain/holiday/BelgianHolidays';

const LOCALES = ['fr', 'en', 'de'] as const;

type Messages = { admin: { holidays: Record<string, unknown> }; errors: { codes: Record<string, string> } };

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

describe('traductions de la page Congés', () => {
  const reference = flatten(load('fr').admin.holidays).sort();

  it.each(LOCALES)('%s possède exactement les mêmes clés admin.holidays.* que le français', (locale) => {
    expect(flatten(load(locale).admin.holidays).sort()).toEqual(reference);
  });

  it.each(LOCALES)('%s nomme chaque jour férié belge (clés lues par l\'action d\'import)', (locale) => {
    const belgian = load(locale).admin.holidays.belgian as Record<string, string>;

    for (const key of BELGIAN_HOLIDAY_KEYS) {
      expect(belgian[key], `${locale} : admin.holidays.belgian.${key}`).toBeTruthy();
    }
  });

  it.each(LOCALES)('%s traduit le code d\'erreur HOLIDAY_CONFLICTS', (locale) => {
    expect(load(locale).errors.codes.HOLIDAY_CONFLICTS).toBeTruthy();
  });
});
