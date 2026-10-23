// src/components/admin/appointments.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['fr', 'en', 'de'] as const;

type Messages = { admin: { appointments: Record<string, unknown>; calendar: Record<string, unknown> } };

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

describe('traductions de la page Rendez-vous', () => {
  const reference = flatten(load('fr').admin.appointments).sort();

  it.each(LOCALES)('%s possède exactement les mêmes clés admin.appointments.* que le français', (locale) => {
    expect(flatten(load(locale).admin.appointments).sort()).toEqual(reference);
  });

  it.each(LOCALES)('%s possède exactement les mêmes clés admin.calendar.* que le français', (locale) => {
    expect(flatten(load(locale).admin.calendar).sort()).toEqual(flatten(load('fr').admin.calendar).sort());
  });

  it.each(['en', 'de'] as const)('%s : la fiche ne contient aucun TODO_TRANSLATE', (locale) => {
    const details = JSON.stringify(load(locale).admin.appointments.details);
    expect(details).not.toContain('TODO_TRANSLATE');
  });
});
