// src/domain/audit/AuditLogCursor.test.ts
import { describe, expect, it } from 'vitest';
import { decodeAuditLogCursor, encodeAuditLogCursor, isAuditLogCursor } from './AuditLogCursor';

const ID = '3f2b8c1e-5a4d-4e2b-9c1a-0d7e6f5a4b3c';
const CURSOR = { createdAt: '2026-10-06T12:30:45.123456Z', id: ID };

/** Fabrique un curseur « émis » à la main, comme le ferait un client qui forge sa requête. */
function forge(payload: unknown): string {
  return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('AuditLogCursor', () => {
  it('survit à un aller-retour encodage → décodage, microsecondes comprises', () => {
    expect(decodeAuditLogCursor(encodeAuditLogCursor(CURSOR))).toEqual(CURSOR);
  });

  it('produit une chaîne sûre dans une URL (base64url, sans « + », « / » ni « = »)', () => {
    expect(encodeAuditLogCursor(CURSOR)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('normalise le « +00:00 » renvoyé par PostgREST en « Z »', () => {
    const encoded = encodeAuditLogCursor({ createdAt: '2026-10-06T12:30:45.123456+00:00', id: ID });
    expect(decodeAuditLogCursor(encoded)).toEqual(CURSOR);
  });

  it('refuse d\'encoder un curseur invalide', () => {
    expect(() => encodeAuditLogCursor({ createdAt: 'hier', id: ID })).toThrow();
  });

  describe('décodage d\'un curseur forgé', () => {
    it.each([
      ['une virgule et une parenthèse dans l\'horodatage (injection dans le filtre or())', { t: '2026-10-06T12:00:00Z),or(id.gt.0', i: ID }],
      ['un identifiant qui n\'est pas un UUID', { t: '2026-10-06T12:00:00Z', i: 'id.gt.0' }],
      ['un horodatage avec fuseau décalé', { t: '2026-10-06T12:00:00+02:00', i: ID }],
      ['des champs manquants', { t: '2026-10-06T12:00:00Z' }],
      ['des champs de mauvais type', { t: 20261006, i: 1 }],
      ['autre chose qu\'un objet', 'chaîne'],
    ])('rejette %s', (_label, payload) => {
      expect(decodeAuditLogCursor(forge(payload))).toBeNull();
    });

    it.each([['chaîne vide', ''], ['pas du base64', '%%%'], ['base64 qui n\'est pas du JSON', 'bm9uLWpzb24']])(
      'rejette %s',
      (_label, raw) => {
        expect(decodeAuditLogCursor(raw)).toBeNull();
      },
    );
  });

  describe('isAuditLogCursor', () => {
    it('accepte un curseur valide, avec ou sans fraction de seconde', () => {
      expect(isAuditLogCursor(CURSOR)).toBe(true);
      expect(isAuditLogCursor({ createdAt: '2026-10-06T12:30:45Z', id: ID })).toBe(true);
    });

    it.each([null, undefined, 'x', 42, {}, { createdAt: CURSOR.createdAt }, { createdAt: CURSOR.createdAt, id: 'pas-un-uuid' }])(
      'refuse %j',
      (value) => {
        expect(isAuditLogCursor(value)).toBe(false);
      },
    );
  });
});
