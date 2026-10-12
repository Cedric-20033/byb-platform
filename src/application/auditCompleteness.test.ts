// src/application/auditCompleteness.test.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AuditAction } from '@/domain/shared/AuditLogger';

/**
 * Garde-fou de complétude du journal d'audit : toute nouvelle opération qui
 * modifie un état doit être tracée. Le test échoue si un use case est ajouté
 * sans appel à `auditLogger.log(` — sauf s'il est déclaré en lecture seule ici,
 * ce qui force une décision explicite en revue de code.
 */
const APPLICATION_DIR = resolve(process.cwd(), 'src/application');

/** Use cases et utilitaires qui ne modifient aucun état (aucune trace attendue). */
const READ_ONLY = new Set([
  'GetDashboardStats',
  'ListAppointments',
  'GetAppointmentHistory',
  'GetCalendarRange',
  'FindHolidayConflicts',
  'ListHolidays',
  'GetAvailableSlots',
  'ListAdmins',
  'ListAuditLogs',
  'GetHomeRealisationMedia',
  'GetRealisationsByService',
  'ListServices',
  // Délivre une signature d'upload : aucun état modifié (l'attache est auditée).
  'AuthorizeMediaUpload',
]);

/**
 * Use cases qui modifient l'état EN DÉLÉGUANT à un autre use case, lequel écrit l'audit : chacune des actions
 * unitaires est tracée une fois, par le délégué. Ils ne doivent donc PAS journaliser eux-mêmes (double trace).
 * Clé = use case déléguant, valeur = use case délégué.
 */
const DELEGATING = new Map([['ImportBelgianHolidays', 'CreateHoliday']]);

/** Fichiers sans use case (types partagés, helpers de règle métier). */
const NON_USE_CASES = new Set([
  'AdminActor',
  'ensureNotLastSuperadmin',
  'requireService',
]);

type UseCaseSource = { name: string; path: string; source: string };

function collectUseCases(dir: string): UseCaseSource[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectUseCases(path);
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) return [];
    const name = entry.name.replace(/\.ts$/, '');
    if (NON_USE_CASES.has(name)) return [];
    return [{ name, path, source: readFileSync(path, 'utf8') }];
  });
}

const useCases = collectUseCases(APPLICATION_DIR);
const writers = useCases.filter((u) => !READ_ONLY.has(u.name) && !DELEGATING.has(u.name));
const readers = useCases.filter((u) => READ_ONLY.has(u.name));
const delegating = useCases.filter((u) => DELEGATING.has(u.name));

describe('complétude du journal d’audit', () => {
  it('découvre des use cases (le scan ne doit pas être vide)', () => {
    expect(writers.length).toBeGreaterThan(10);
    expect(readers.length).toBe(READ_ONLY.size);
    expect(delegating.length).toBe(DELEGATING.size);
  });

  it.each(writers.map((u) => [u.name, u] as const))(
    '%s trace son action via auditLogger.log()',
    (_name, useCase) => {
      expect(useCase.source).toContain('auditLogger.log(');
    },
  );

  it.each(writers.map((u) => [u.name, u] as const))(
    '%s utilise une valeur de l’enum AuditAction (pas de chaîne libre)',
    (_name, useCase) => {
      const used = [...useCase.source.matchAll(/AuditAction\.([A-Z_]+)/g)].map((m) => m[1]);
      expect(used.length).toBeGreaterThan(0);
      for (const key of used) {
        expect(Object.keys(AuditAction)).toContain(key);
      }
    },
  );

  it.each(delegating.map((u) => [u.name, u] as const))(
    '%s délègue son audit à un use case qui trace, sans journaliser lui-même',
    (name, useCase) => {
      const delegate = DELEGATING.get(name)!;

      // Le délégué est bien un use case écrivant l'audit, et ce use case s'en sert réellement.
      expect(writers.map((u) => u.name), `${delegate} doit être un use case qui trace`).toContain(delegate);
      expect(useCase.source).toContain(delegate);
      expect(useCase.source, name).not.toContain('auditLogger.log(');
    },
  );

  it.each(readers.map((u) => [u.name, u] as const))(
    '%s (lecture seule) n’écrit pas dans le journal',
    (name, useCase) => {
      // ListAuditLogs ne doit jamais s'auto-tracer ; l'export, lui, est audité.
      expect(useCase.source, name).not.toContain('auditLogger.log(');
    },
  );
});
