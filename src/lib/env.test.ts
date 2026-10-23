// src/lib/env.test.ts
import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const DEV_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
};

const PROD_ENV = {
  ...DEV_ENV,
  NEXT_PUBLIC_APP_URL: 'https://byb.be',
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  RESEND_API_KEY: 're_123',
};

describe('parseEnv', () => {
  it('accepte le minimum en développement', () => {
    expect(() => parseEnv(DEV_ENV, false)).not.toThrow();
  });

  it('accepte une configuration de production complète', () => {
    expect(() => parseEnv(PROD_ENV, true)).not.toThrow();
  });

  it('liste toutes les variables manquantes d\'un coup', () => {
    expect(() => parseEnv({}, false)).toThrow(/NEXT_PUBLIC_SUPABASE_URL[\s\S]*SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('exige en production les variables d\'emails et de médias', () => {
    expect(() => parseEnv(DEV_ENV, true)).toThrow(/RESEND_API_KEY est requise en production/);
  });

  it('refuse une URL publique en http en production', () => {
    expect(() => parseEnv({ ...PROD_ENV, NEXT_PUBLIC_APP_URL: 'http://byb.be' }, true)).toThrow(/https/);
  });

  it('exige les deux clés Turnstile ensemble', () => {
    expect(() => parseEnv({ ...DEV_ENV, TURNSTILE_SECRET_KEY: 'secret' }, false)).toThrow(/vont ensemble/);
  });

  it('ne reproduit jamais la valeur d\'un secret dans le message', () => {
    try {
      parseEnv({ ...DEV_ENV, NEXT_PUBLIC_SUPABASE_URL: 'pas-une-url-secret-xyz' }, false);
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain('secret-xyz');
    }
  });
});
