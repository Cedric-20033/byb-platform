// src/lib/constants.test.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ADMIN_PERMISSIONS, PERMISSION_ACTIONS, PERMISSION_DOMAINS } from './constants';

describe('DEFAULT_ADMIN_PERMISSIONS', () => {
  it('couvre chaque domaine et chaque action', () => {
    expect(Object.keys(DEFAULT_ADMIN_PERMISSIONS).sort()).toEqual([...PERMISSION_DOMAINS].sort());
    for (const domain of PERMISSION_DOMAINS) {
      expect(Object.keys(DEFAULT_ADMIN_PERMISSIONS[domain]).sort()).toEqual([...PERMISSION_ACTIONS].sort());
    }
  });

  it('est identique à la copie SQL en vigueur (dernière migration qui redéfinit default_admin_permissions)', () => {
    const dir = join(process.cwd(), 'supabase', 'migrations');
    // Les migrations sont numérotées : la dernière à contenir le bloc fait foi.
    const latest = readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => ({ file, sql: readFileSync(join(dir, file), 'utf8') }))
      .filter(({ sql }) => /\$perms\$[\s\S]*?\$perms\$/.test(sql))
      .at(-1);

    expect(latest, 'aucune migration ne définit default_admin_permissions()').toBeDefined();
    const match = latest!.sql.match(/\$perms\$([\s\S]*?)\$perms\$/);
    expect(JSON.parse(match![1]), `copie SQL de ${latest!.file}`).toEqual(DEFAULT_ADMIN_PERMISSIONS);
  });

  it('ne donne à un admin aucun droit sur les utilisateurs ni le journal d\'audit', () => {
    expect(Object.values(DEFAULT_ADMIN_PERMISSIONS.users).some(Boolean)).toBe(false);
    expect(Object.values(DEFAULT_ADMIN_PERMISSIONS.audit_logs).some(Boolean)).toBe(false);
  });
});
