// src/lib/messages.parity.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type MessageTree = { [key: string]: MessageTree | string };

const REFERENCE = 'fr';
const TRANSLATIONS = ['en', 'de'] as const;

function load(locale: string): MessageTree {
  return JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8')) as MessageTree;
}

function flatten(node: MessageTree, prefix = ''): Record<string, string> {
  return Object.entries(node).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

/** Variables ICU simples ({name}, {count, plural, ...}) et balises riches (<link>). */
function placeholders(message: string): string[] {
  const variables = [...message.matchAll(/\{(\w+)\s*(?:,|\})/g)].map((match) => `{${match[1]}}`);
  const tags = [...message.matchAll(/<\/?(\w+)>/g)].map((match) => `<${match[1]}>`);
  return [...new Set([...variables, ...tags])].sort();
}

const reference = flatten(load(REFERENCE));

describe.each(TRANSLATIONS)('messages/%s.json (référence : fr)', (locale) => {
  const messages = flatten(load(locale));

  it('contient exactement les mêmes clés que le français', () => {
    const missing = Object.keys(reference).filter((key) => !(key in messages));
    const extra = Object.keys(messages).filter((key) => !(key in reference));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('ne contient plus aucun TODO_TRANSLATE ni valeur vide', () => {
    const unfinished = Object.entries(messages)
      .filter(([, value]) => value.includes('TODO_TRANSLATE') || value.trim() === '')
      .map(([key]) => key);
    expect(unfinished).toEqual([]);
  });

  it('utilise les mêmes variables et balises que le français', () => {
    const mismatches = Object.keys(reference)
      .filter((key) => key in messages)
      .filter((key) => placeholders(reference[key]).join() !== placeholders(messages[key]).join())
      .map((key) => key);
    expect(mismatches).toEqual([]);
  });
});
