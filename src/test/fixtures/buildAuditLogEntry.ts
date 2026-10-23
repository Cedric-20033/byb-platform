// src/test/fixtures/buildAuditLogEntry.ts
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';

const BASE_INSTANT_MS = Date.UTC(2026, 9, 6, 12, 0, 0); // 6 octobre 2026, 12 h UTC

/**
 * Entrée de journal de test. `n` fixe à la fois l'identifiant (UUID valide, ordonné) et l'instant
 * (n secondes après l'instant de base) : une entrée de rang plus élevé est donc plus récente.
 */
export function buildAuditLogEntry(n: number, overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    actorId: null,
    actorName: null,
    actorEmail: null,
    actorRole: ActorRole.ADMIN,
    action: AuditAction.SLOT_BLOCKED,
    targetType: 'slot',
    targetId: null,
    metadata: {},
    ipAddress: null,
    createdAt: new Date(BASE_INSTANT_MS + n * 1000).toISOString(),
    ...overrides,
  };
}
