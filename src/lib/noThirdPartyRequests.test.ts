// src/lib/noThirdPartyRequests.test.ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou RGPD : aucune requête vers un tiers ne doit partir d'elle-même au chargement d'une page. La politique de
 * confidentialité affirme que le site n'utilise ni cookie publicitaire ni mesure d'audience, et que les cartes ne
 * contactent Google qu'au clic : ce test échoue si le code cesse de le garantir.
 */

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(process.cwd(), path).split(sep).join('/'),
  content: readFileSync(path, 'utf8'),
}));

describe('aucune requête tierce automatique', () => {
  it.each([
    ['polices Google (adresse IP du visiteur transmise à Google)', /fonts\.googleapis\.com|fonts\.gstatic\.com/],
    ['mesure d\'audience Google', /googletagmanager\.com|google-analytics\.com|gtag\(/],
    ['pixel ou script publicitaire', /connect\.facebook\.net|snap\.licdn\.com|static\.hotjar\.com|analytics\.tiktok\.com/],
  ])('le code ne charge pas : %s', (_name, pattern) => {
    const offenders = files.filter((file) => pattern.test(file.content)).map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('une carte tierce n\'est intégrée que par ConsentMap, qui attend le clic du visiteur', () => {
    const withIframe = files.filter((file) => /<iframe/.test(file.content)).map((file) => file.path);

    expect(withIframe).toEqual(['src/components/contact/ConsentMap.tsx']);
  });

  it('ConsentMap ne rend l\'iframe qu\'après un état « chargé » déclenché par un clic', () => {
    const source = files.find((file) => file.path === 'src/components/contact/ConsentMap.tsx')!.content;

    expect(source).toMatch(/useState\(false\)/);
    expect(source).toMatch(/onClick=\{\(\) => setLoaded\(true\)\}/);
    expect(source.indexOf('if (loaded)')).toBeLessThan(source.indexOf('<iframe'));
  });

  it('les polices sont servies par le site (next/font) et non par un @import CSS', () => {
    const layout = files.find((file) => file.path === 'src/app/[locale]/layout.tsx')!.content;
    const css = files.find((file) => file.path === 'src/app/[locale]/globals.css')!.content;

    expect(layout).toContain("from 'next/font/google'");
    expect(css).not.toMatch(/@import\s+url\(/);
  });
});
