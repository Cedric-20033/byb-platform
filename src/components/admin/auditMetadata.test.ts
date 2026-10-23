// src/components/admin/auditMetadata.test.ts
import { describe, expect, it } from 'vitest';
import { describeMetadata } from './auditMetadata';

describe('describeMetadata', () => {
  it('retourne une liste vide pour un metadata vide', () => {
    expect(describeMetadata({})).toEqual([]);
  });

  it('affiche les scalaires tels quels', () => {
    expect(describeMetadata({ reason: 'Imprévu', count: 3, flag: true, none: null })).toEqual([
      { kind: 'value', label: 'reason', value: 'Imprévu' },
      { kind: 'value', label: 'count', value: 3 },
      { kind: 'value', label: 'flag', value: true },
      { kind: 'value', label: 'none', value: null },
    ]);
  });

  it('reconnaît un changement { from, to }', () => {
    expect(describeMetadata({ role: { from: 'admin', to: 'superadmin' } })).toEqual([
      { kind: 'change', label: 'role', from: 'admin', to: 'superadmin' },
    ]);
  });

  it('déroule un diff de permissions en une ligne par case', () => {
    const rows = describeMetadata({
      changes: [
        { domain: 'holidays', action: 'create', from: false, to: true },
        { domain: 'audit_logs', action: 'export', from: true, to: false },
      ],
    });
    expect(rows).toEqual([
      { kind: 'change', label: 'holidays.create', from: false, to: true },
      { kind: 'change', label: 'audit_logs.export', from: true, to: false },
    ]);
  });

  it('déroule les objets imbriqués avec des libellés pointés', () => {
    expect(describeMetadata({ a: { b: { c: 1 } } })).toEqual([{ kind: 'value', label: 'a.b.c', value: 1 }]);
  });

  it('bascule en JSON compact au-delà de la profondeur maximale', () => {
    const rows = describeMetadata({ a: { b: { c: { d: { e: 1 } } } } });
    expect(rows).toEqual([{ kind: 'value', label: 'a.b.c.d', value: '{"e":1}' }]);
  });

  it('joint les tableaux de scalaires et sérialise les tableaux mixtes', () => {
    expect(describeMetadata({ ids: ['a', 'b'], mixed: [1, { x: 1 }] })).toEqual([
      { kind: 'value', label: 'ids', value: 'a, b' },
      { kind: 'value', label: 'mixed', value: '[1,{"x":1}]' },
    ]);
  });

  it('ne prend pas { from, to } avec une clé supplémentaire pour un changement', () => {
    const rows = describeMetadata({ x: { from: 1, to: 2, extra: 3 } });
    expect(rows.map((r) => r.kind)).toEqual(['value', 'value', 'value']);
  });

  it('traite un tableau de permissions vide comme un tableau ordinaire', () => {
    expect(describeMetadata({ changes: [] })).toEqual([{ kind: 'value', label: 'changes', value: '' }]);
  });
});
