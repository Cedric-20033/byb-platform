// src/lib/audit.i18n.test.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';

const LOCALES = ['fr', 'en', 'de'] as const;

type Tree = { [key: string]: string | Tree };

function loadAuditMessages(locale: string): Tree {
  const raw = readFileSync(resolve(process.cwd(), 'messages', `${locale}.json`), 'utf8');
  return (JSON.parse(raw) as { admin: { auditLogs: Tree } }).admin.auditLogs;
}

/** Aplatit l'arbre en chemins pointés (`filters.action`, …) pour comparer les jeux de clés. */
function flatten(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`),
  );
}

const messages = Object.fromEntries(LOCALES.map((locale) => [locale, loadAuditMessages(locale)]));

describe('i18n du journal d’audit', () => {
  it.each(['en', 'de'] as const)('%s expose exactement les mêmes clés que fr', (locale) => {
    expect(flatten(messages[locale]).sort()).toEqual(flatten(messages.fr).sort());
  });

  it.each(LOCALES)('%s : aucune valeur vide', (locale) => {
    const tree = messages[locale];
    for (const path of flatten(tree)) {
      const value = path.split('.').reduce<string | Tree>((node, key) => (node as Tree)[key], tree);
      expect(value, `${locale}:${path}`).not.toBe('');
    }
  });

  it.each(LOCALES)('%s : chaque AuditAction a un libellé', (locale) => {
    const actions = messages[locale].actions as Tree;
    for (const action of Object.values(AuditAction)) {
      expect(actions[action], `${locale}:actions.${action}`).toEqual(expect.any(String));
    }
  });

  it.each(LOCALES)('%s : chaque rôle d’acteur a un libellé', (locale) => {
    const roles = messages[locale].actorRoles as Tree;
    for (const role of Object.values(ActorRole)) {
      expect(roles[role], `${locale}:actorRoles.${role}`).toEqual(expect.any(String));
    }
  });
});
