// src/components/admin/permissions.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DELEGABLE_DOMAINS, PERMISSION_ACTIONS, PERMISSION_PRESET_IDS } from '@/domain/user/PermissionCatalog';

const LOCALES = ['fr', 'en', 'de'] as const;

type Permissions = {
  domains: Record<string, string>;
  actions: Record<string, string>;
  presets: Record<string, string>;
  [key: string]: unknown;
};

function load(locale: string): Permissions {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8')).admin.permissions;
}

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? flatten(child as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('traductions de la page Permissions', () => {
  const reference = flatten(load('fr')).sort();

  it.each(LOCALES)('%s possède exactement les mêmes clés admin.permissions.* que le français', (locale) => {
    expect(flatten(load(locale)).sort()).toEqual(reference);
  });

  it.each(LOCALES)('%s traduit chaque domaine, action et preset du catalogue', (locale) => {
    const messages = load(locale);
    expect(Object.keys(messages.domains).sort()).toEqual([...DELEGABLE_DOMAINS].sort());
    expect(Object.keys(messages.actions).sort()).toEqual([...PERMISSION_ACTIONS].sort());
    expect(Object.keys(messages.presets).filter((key) => key !== 'title').sort()).toEqual([...PERMISSION_PRESET_IDS].sort());
  });
});
