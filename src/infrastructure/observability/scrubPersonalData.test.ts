// src/infrastructure/observability/scrubPersonalData.test.ts
import { describe, expect, it } from 'vitest';
import { scrubError, scrubTags, scrubText } from './scrubPersonalData';

describe('scrubText', () => {
  it.each([
    ['un email', 'Key (email)=(jean.dupont@example.be) already exists', 'jean.dupont@example.be'],
    ['un numéro international', 'appel +32 471 54 81 63 échoué', '471 54 81 63'],
    ['un mobile belge', 'tel 0471 54 81 63', '0471 54 81 63'],
    ['un JWT', 'jeton eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-def_123', 'eyJhbGciOiJIUzI1NiJ9'],
    ['un en-tête Bearer', 'Authorization: Bearer abc.def-123', 'abc.def-123'],
    ['le jeton d\'un lien de rendez-vous', 'GET /fr/rdv/annuler/8f3a9c2e-77aa-4d1b', '8f3a9c2e-77aa-4d1b'],
    ['une clé d\'API', 'RESEND_API_KEY=re_live_123456', 're_live_123456'],
  ])('masque %s', (_label, input, secret) => {
    const output = scrubText(input);

    expect(output).not.toContain(secret);
  });

  it('laisse intacts les dates et les identifiants techniques', () => {
    const text = 'Créneau 2026-10-21 10:00 introuvable (id 3f2c1b7a-1111-4a2b-9c3d-123456789abc)';

    expect(scrubText(text)).toBe(text);
  });
});

describe('scrubError', () => {
  it('masque le message et la pile, et conserve le digest', () => {
    const error = Object.assign(new Error('Échec pour marc@exemple.be'), { digest: '12345' });

    const scrubbed = scrubError(error);

    expect(scrubbed.message).toBe('Échec pour [email]');
    expect(scrubbed.stack).not.toContain('marc@exemple.be');
    expect(scrubbed.digest).toBe('12345');
  });

  it('accepte une valeur qui n\'est pas une Error', () => {
    expect(scrubError('boom marc@exemple.be')).toEqual({ name: 'NonError', message: 'boom [email]' });
  });
});

describe('scrubTags', () => {
  it('masque chaque valeur et laisse passer l\'absence d\'étiquettes', () => {
    expect(scrubTags({ path: '/fr/rdv/modifier/abc123' })).toEqual({ path: '/fr/rdv/modifier/[token]' });
    expect(scrubTags(undefined)).toBeUndefined();
  });
});
