// src/lib/noSecretsInClient.test.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou P3.3 : aucune clé secrète ne doit pouvoir atteindre le bundle navigateur.
 * Tout fichier `'use client'` est scanné ; l'adaptateur Cloudinary et le SDK serveur
 * lui sont interdits (seul `src/lib/cloudinary-url.ts` construit des URLs publiques).
 */
const SRC = join(process.cwd(), 'src');

function listSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listSources(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const clientFiles = listSources(SRC)
  .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
  .filter(({ source }) => /^\s*(\/\/.*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(source));

const FORBIDDEN = [
  { label: 'CLOUDINARY_API_SECRET', pattern: /CLOUDINARY_API_SECRET/ },
  { label: 'SUPABASE_SERVICE_ROLE_KEY', pattern: /SUPABASE_SERVICE_ROLE_KEY/ },
  { label: 'l\'adaptateur serveur Cloudinary', pattern: /infrastructure\/cloudinary/ },
  { label: 'le SDK serveur cloudinary', pattern: /from ['"]cloudinary['"]/ },
];

describe('aucun secret dans le code client', () => {
  it('trouve des composants client à analyser', () => {
    expect(clientFiles.length).toBeGreaterThan(10);
  });

  it.each(FORBIDDEN.map((rule) => [rule.label, rule.pattern] as const))('aucun fichier client ne référence %s', (_label, pattern) => {
    const offenders = clientFiles.filter(({ source }) => pattern.test(source)).map(({ path }) => path);

    expect(offenders).toEqual([]);
  });
});
