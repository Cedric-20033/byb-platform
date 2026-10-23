// src/lib/validation/auditLogs.test.ts
import { describe, expect, it } from 'vitest';
import { auditLogFiltersSchema, exportAuditLogsSchema, listAuditLogsSchema } from './auditLogs';

const UUID = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('auditLogFiltersSchema', () => {
  it('accepte l’absence de filtres', () => {
    expect(auditLogFiltersSchema.safeParse({}).success).toBe(true);
  });

  it('accepte des filtres valides', () => {
    const result = auditLogFiltersSchema.safeParse({
      actorId: UUID,
      actorRole: 'admin',
      action: 'SLOT_BLOCKED',
      targetType: 'slot',
      targetId: ' abc ',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.targetId).toBe('abc');
  });

  it.each([
    ['actorId non UUID', { actorId: 'pas-un-uuid' }],
    ['rôle inconnu', { actorRole: 'root' }],
    ['action en minuscules', { action: 'slot_blocked' }],
    ['action avec injection', { action: 'X);DROP' }],
    ['targetType en majuscules', { targetType: 'Slot' }],
    ['targetId vide', { targetId: '   ' }],
    ['targetId trop long', { targetId: 'a'.repeat(101) }],
    ['date invalide', { dateFrom: '2026-13-45' }],
    ['chaîne vide', { actorId: '' }],
  ])('refuse : %s', (_label, input) => {
    expect(auditLogFiltersSchema.safeParse(input).success).toBe(false);
  });

  it('refuse une période dont le début suit la fin, avec une erreur portée par dateTo', () => {
    const result = auditLogFiltersSchema.safeParse({ dateFrom: '2026-10-10', dateTo: '2026-10-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue.message).toBe('startDateAfterEnd');
      expect(issue.path).toEqual(['dateTo']);
    }
  });

  it('accepte une période d’un seul jour', () => {
    expect(auditLogFiltersSchema.safeParse({ dateFrom: '2026-10-10', dateTo: '2026-10-10' }).success).toBe(true);
  });
});

describe('listAuditLogsSchema', () => {
  it('accepte un curseur absent, nul ou renseigné', () => {
    expect(listAuditLogsSchema.safeParse({}).success).toBe(true);
    expect(listAuditLogsSchema.safeParse({ cursor: null }).success).toBe(true);
    expect(listAuditLogsSchema.safeParse({ cursor: 'abc' }).success).toBe(true);
  });

  it('refuse un curseur vide ou démesuré', () => {
    expect(listAuditLogsSchema.safeParse({ cursor: '' }).success).toBe(false);
    expect(listAuditLogsSchema.safeParse({ cursor: 'a'.repeat(301) }).success).toBe(false);
  });
});

describe('exportAuditLogsSchema', () => {
  it('n’accepte que des filtres (pas de curseur)', () => {
    expect(exportAuditLogsSchema.safeParse({ filters: { action: 'SLOT_BLOCKED' } }).success).toBe(true);
    expect(exportAuditLogsSchema.safeParse({ filters: { action: 'bad' } }).success).toBe(false);
  });
});
