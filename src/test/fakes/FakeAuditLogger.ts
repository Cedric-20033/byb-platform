// src/test/fakes/FakeAuditLogger.ts
import type { AuditEntry, AuditLogger } from '@/domain/shared/AuditLogger';

/** Enregistre les entrées d'audit : les tests vérifient `entries`. */
export class FakeAuditLogger implements AuditLogger {
  readonly entries: AuditEntry[] = [];

  async log(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}
