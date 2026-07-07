'use server';

// src/app/actions/admin/appointments.ts
import { appointmentSearchFiltersSchema } from '@/lib/validation/appointment';
import { ListAppointments } from '@/application/admin/ListAppointments';
import { ExportAppointments, type AppointmentExportRow } from '@/application/admin/ExportAppointments';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission, toActorRole } from '@/lib/auth/getCurrentAdmin';
import type { Appointment } from '@/domain/appointment/Appointment';

type ListResult = { success: true; appointments: Appointment[] } | { success: false; error: string };
type ExportResult = { success: true; rows: AppointmentExportRow[] } | { success: false; error: string };

/**
 * Consultation des RDV — le client `server.ts` (session admin, pas service_role)
 * fait que le RLS applique directement `has_permission('appointments', 'view')`.
 */
export async function listAppointmentsAction(filters: unknown): Promise<ListResult> {
  const parsed = appointmentSearchFiltersSchema.safeParse(filters ?? {});
  if (!parsed.success) {
    return { success: false, error: 'Filtres invalides.' };
  }

  const supabase = await createClient();
  const useCase = new ListAppointments(new SupabaseAppointmentRepository(supabase));
  const appointments = await useCase.execute(parsed.data);
  return { success: true, appointments };
}

/**
 * Export Excel/CSV — le RLS ne distingue pas "consulter" d'"exporter" (même
 * requête SELECT du point de vue de Postgres). La permission 'export' est
 * donc vérifiée explicitement ici, avant même d'exécuter le use case.
 */
export async function exportAppointmentsAction(filters: unknown): Promise<ExportResult> {
  const parsed = appointmentSearchFiltersSchema.safeParse(filters ?? {});
  if (!parsed.success) {
    return { success: false, error: 'Filtres invalides.' };
  }

  const admin = await getCurrentAdmin();
  try {
    assertPermission(admin, 'appointments', 'export');
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Non autorisé.' };
  }

  const supabase = await createClient();
  const useCase = new ExportAppointments(
    new SupabaseAppointmentRepository(supabase),
    new SupabaseAuditLogger(),
  );

  const rows = await useCase.execute({
    filters: parsed.data,
    actorId: admin.id,
    actorRole: toActorRole(admin.role),
  });

  return { success: true, rows };
}
