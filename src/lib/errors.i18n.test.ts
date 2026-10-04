// src/lib/errors.i18n.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACTION_ERROR_CODES } from './errors';

const LOCALES = ['fr', 'en', 'de'] as const;

function loadErrorCodes(locale: string): Record<string, string> {
  const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));
  return messages.errors.codes;
}

describe('codes d\'erreur des Server Actions — traductions', () => {
  it.each(LOCALES)('%s traduit chaque code, sans clé orpheline', (locale) => {
    const translated = loadErrorCodes(locale);

    expect(Object.keys(translated).sort()).toEqual([...ACTION_ERROR_CODES].sort());
    for (const message of Object.values(translated)) {
      expect(message.trim().length).toBeGreaterThan(0);
    }
  });
});
