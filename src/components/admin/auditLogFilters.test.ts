// src/components/admin/auditLogFilters.test.ts
import { describe, expect, it } from 'vitest';
import { ActorRole } from '@/domain/shared/AuditLogger';
import { EMPTY_AUDIT_FILTERS, hasInvalidPeriod, toFilterPayload } from './auditLogFilters';

describe('toFilterPayload', () => {
  it('omet tous les champs vides', () => {
    expect(toFilterPayload(EMPTY_AUDIT_FILTERS)).toEqual({});
  });

  it('n’envoie jamais le libellé de la pastille auteur', () => {
    const payload = toFilterPayload({ ...EMPTY_AUDIT_FILTERS, actorId: 'abc', actorLabel: 'Jean' });
    expect(payload).toEqual({ actorId: 'abc' });
    expect(payload).not.toHaveProperty('actorLabel');
  });

  it('rogne l’identifiant de cible et omet une cible faite d’espaces', () => {
    expect(toFilterPayload({ ...EMPTY_AUDIT_FILTERS, targetId: '  slot-1  ' })).toEqual({ targetId: 'slot-1' });
    expect(toFilterPayload({ ...EMPTY_AUDIT_FILTERS, targetId: '   ' })).toEqual({});
  });

  it('transmet tous les filtres renseignés', () => {
    expect(
      toFilterPayload({
        actorId: 'id',
        actorLabel: 'x',
        actorRole: ActorRole.SUPERADMIN,
        action: 'SLOT_BLOCKED',
        targetType: 'slot',
        targetId: 't',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-31',
      }),
    ).toEqual({
      actorId: 'id',
      actorRole: ActorRole.SUPERADMIN,
      action: 'SLOT_BLOCKED',
      targetType: 'slot',
      targetId: 't',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
    });
  });
});

describe('hasInvalidPeriod', () => {
  it.each([
    ['début après fin', '2026-10-10', '2026-10-01', true],
    ['même jour', '2026-10-10', '2026-10-10', false],
    ['période normale', '2026-10-01', '2026-10-10', false],
    ['borne ouverte (début seul)', '2026-10-01', '', false],
    ['borne ouverte (fin seule)', '', '2026-10-01', false],
    ['aucune borne', '', '', false],
  ])('%s', (_label, dateFrom, dateTo, expected) => {
    expect(hasInvalidPeriod({ dateFrom, dateTo })).toBe(expected);
  });
});
