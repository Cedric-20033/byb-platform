// src/components/admin/auditLogsCsv.test.ts
import { describe, expect, it } from 'vitest';
import { ActorRole } from '@/domain/shared/AuditLogger';
import { buildAuditLogEntry } from '@/test/fixtures/buildAuditLogEntry';
import { buildAuditLogsCsv, type AuditCsvOptions } from './auditLogsCsv';

const columns: AuditCsvOptions['columns'] = {
  date: 'Date',
  actor: 'Auteur',
  email: 'Email',
  role: 'Rôle',
  action: 'Action',
  actionCode: 'Code',
  targetType: 'Type',
  targetId: 'Cible',
  ip: 'IP',
  details: 'Détails',
};

const options = (overrides: Partial<AuditCsvOptions> = {}): AuditCsvOptions => ({
  columns,
  separator: ';',
  formatDate: (iso) => iso,
  actionLabel: (code) => `L:${code}`,
  targetTypeLabel: (type) => `T:${type}`,
  roleLabel: (role) => `R:${role}`,
  ...overrides,
});

describe('buildAuditLogsCsv', () => {
  it('produit l’en-tête traduit puis une ligne par entrée, séparées par CRLF', () => {
    const csv = buildAuditLogsCsv([buildAuditLogEntry(1)], options());
    const [header, line, ...rest] = csv.split('\r\n');
    expect(header).toBe('Date;Auteur;Email;Rôle;Action;Code;Type;Cible;IP;Détails');
    expect(line.split(';')).toHaveLength(10);
    expect(rest).toEqual([]);
  });

  it('ne produit que l’en-tête pour une liste vide', () => {
    expect(buildAuditLogsCsv([], options())).toBe('Date;Auteur;Email;Rôle;Action;Code;Type;Cible;IP;Détails');
  });

  it('applique les libellés et laisse vides les valeurs nulles', () => {
    const entry = buildAuditLogEntry(1, { actorRole: ActorRole.SYSTEM });
    const cells = buildAuditLogsCsv([entry], options()).split('\r\n')[1].split(';');
    expect(cells.slice(1, 3)).toEqual(['', '']); // auteur et email
    expect(cells[3]).toBe('R:system');
    expect(cells[4]).toBe('L:SLOT_BLOCKED');
    expect(cells[5]).toBe('SLOT_BLOCKED');
    expect(cells[6]).toBe('T:slot');
    expect(cells[7]).toBe('');
    expect(cells[9]).toBe('');
  });

  it('entoure de guillemets les cellules contenant le séparateur, un guillemet ou un saut de ligne', () => {
    const entry = buildAuditLogEntry(1, { actorName: 'Dupont; Jean', targetId: 'a"b', ipAddress: 'x\ny' });
    const line = buildAuditLogsCsv([entry], options()).split('\r\n').slice(1).join('\r\n');
    expect(line).toContain('"Dupont; Jean"');
    expect(line).toContain('"a""b"');
    expect(line).toContain('"x\ny"');
  });

  it('n’entoure pas de guillemets un point-virgule quand le séparateur est la virgule', () => {
    const entry = buildAuditLogEntry(1, { actorName: 'A;B' });
    const line = buildAuditLogsCsv([entry], options({ separator: ',' })).split('\r\n')[1];
    expect(line).toContain(',A;B,');
  });

  it.each(['=HYPERLINK("http://x")', '+1', '-1', '@SUM(A1)', '\tfoo'])(
    'neutralise la formule %j par une apostrophe',
    (payload) => {
      const entry = buildAuditLogEntry(1, { actorName: payload });
      const line = buildAuditLogsCsv([entry], options()).split('\r\n').slice(1).join('\r\n');
      expect(line).toContain(`'${payload.replaceAll('"', '""')}`);
      expect(line).not.toMatch(/(^|;)"?[=+\-@]/);
    },
  );

  it('sérialise le metadata en JSON dans la colonne détails', () => {
    const entry = buildAuditLogEntry(1, { metadata: { reason: 'x' } });
    const line = buildAuditLogsCsv([entry], options({ separator: ',' })).split('\r\n')[1];
    expect(line).toContain('"{""reason"":""x""}"');
  });
});
