'use server';

// src/app/actions/admin/auditLogs.ts
import { ExportAuditLogs } from '@/application/audit/ExportAuditLogs';
import { ListAuditLogs } from '@/application/audit/ListAuditLogs';
import { decodeAuditLogCursor, encodeAuditLogCursor } from '@/domain/audit/AuditLogCursor';
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { SupabaseAuditLogReader } from '@/infrastructure/supabase/repositories/SupabaseAuditLogReader';
import { createClient } from '@/infrastructure/supabase/server';
import { assertPermission, getCurrentAdmin, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { exportAuditLogsSchema, listAuditLogsSchema } from '@/lib/validation/auditLogs';

/**
 * `AuditLogEntry` est un objet plat (pas une classe) : il traverse tel quel la frontière
 * Server Action → Client Component, sans DTO intermédiaire. Le curseur, lui, est opaque.
 */
type ListResult = { success: true; entries: AuditLogEntry[]; nextCursor: string | null } | ActionFailure;
type ExportResult = { success: true; entries: AuditLogEntry[]; truncated: boolean } | ActionFailure;

/**
 * Une page du journal, du plus récent au plus ancien. Exige `audit_logs.view` ;
 * le RLS (`audit_logs_select_admin`) applique la même règle en seconde barrière.
 */
export async function listAuditLogsAction(input: unknown): Promise<ListResult> {
  try {
    const parsed = listAuditLogsSchema.safeParse(input ?? {});
    if (!parsed.success) return failure('VALIDATION_FAILED');

    // Un curseur illisible est une requête forgée ou périmée, pas une page vide.
    const cursor = parsed.data.cursor ? decodeAuditLogCursor(parsed.data.cursor) : null;
    if (parsed.data.cursor && !cursor) return failure('VALIDATION_FAILED');

    assertPermission(await getCurrentAdmin(), 'audit_logs', 'view');

    const reader = new SupabaseAuditLogReader(await createClient());
    const page = await new ListAuditLogs(reader).execute({ filters: parsed.data.filters, cursor });

    return {
      success: true,
      entries: page.entries,
      nextCursor: page.nextCursor ? encodeAuditLogCursor(page.nextCursor) : null,
    };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Export CSV : `export` est une permission distincte de `view`, et le RLS ne les distingue
 * pas (même SELECT) — elle est donc vérifiée ici. `view` est exigée aussi : sans elle,
 * le RLS renverrait un export vide au lieu d'un refus explicite.
 */
export async function exportAuditLogsAction(input: unknown): Promise<ExportResult> {
  try {
    const parsed = exportAuditLogsSchema.safeParse(input ?? {});
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'audit_logs', 'view');
    assertPermission(admin, 'audit_logs', 'export');

    const useCase = new ExportAuditLogs(
      new SupabaseAuditLogReader(await createClient()),
      new SupabaseAuditLogger(),
    );

    const { entries, truncated } = await useCase.execute({
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
      filters: parsed.data.filters,
    });

    return { success: true, entries, truncated };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
