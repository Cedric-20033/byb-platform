// src/lib/constants.test.ts
import { readFileSync } from 'node:fs';
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

  it('est identique à la copie SQL utilisée par le trigger handle_new_user (migration 0005)', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '0005_auth_profiles_trigger.sql'),
      'utf8',
    );
    const match = sql.match(/\$perms\$([\s\S]*?)\$perms\$/);

    expect(match, 'bloc $perms$ introuvable dans la migration 0005').not.toBeNull();
    expect(JSON.parse(match![1])).toEqual(DEFAULT_ADMIN_PERMISSIONS);
  });

  it('ne donne à un admin aucun droit sur les utilisateurs ni le journal d\'audit', () => {
    expect(Object.values(DEFAULT_ADMIN_PERMISSIONS.users).some(Boolean)).toBe(false);
    expect(Object.values(DEFAULT_ADMIN_PERMISSIONS.audit_logs).some(Boolean)).toBe(false);
  });
});
