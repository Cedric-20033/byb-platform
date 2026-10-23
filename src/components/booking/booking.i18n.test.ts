// src/components/booking/booking.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;

type Messages = { booking?: Record<string, unknown> };

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

describe('traductions de la réservation (booking.*)', () => {
  it.each(LOCALES)('%s définit la section booking', (locale) => {
    expect(load(locale).booking).toBeDefined();
  });

  it.each(LOCALES)('%s possède exactement les mêmes clés booking.* que le français', (locale) => {
    expect(flatten(load(locale).booking ?? {}).sort()).toEqual(flatten(load('fr').booking ?? {}).sort());
  });

  it.each(LOCALES)('%s : aucune valeur booking.* vide ni TODO_TRANSLATE', (locale) => {
    const raw = JSON.stringify(load(locale).booking);

    expect(raw).not.toContain('TODO_TRANSLATE');
    expect(raw).not.toContain('""');
  });

  it.each(LOCALES)('%s : la page /rdv a ses textes de référencement', (locale) => {
    const page = load(locale).booking?.page as Record<string, string>;

    expect(Object.keys(page).sort()).toEqual(['description', 'heading', 'subtitle', 'title']);
  });
});
