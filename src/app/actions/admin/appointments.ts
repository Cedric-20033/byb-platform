'use server';

// src/app/actions/admin/appointments.ts
import { appointmentSearchFiltersSchema, cancelAppointmentSchema } from '@/lib/validation/appointment';
import { ListAppointments } from '@/application/admin/ListAppointments';
import { ConfirmAppointment } from '@/application/admin/ConfirmAppointment';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { ExportAppointments, type AppointmentExportRow } from '@/application/admin/ExportAppointments';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { toUserMessage, PERMISSION_DENIED_MESSAGE } from '@/lib/errors';
import { z } from 'zod';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';
import type { AppointmentStatus } from '@/domain/appointment/Appointment';

/**
 * DTO plat : `AppointmentWithSlot.appointment` est une instance de la classe
 * `Appointment`, non sérialisable à travers la frontière Server Action →
 * Client Component. On aplatit tout en un seul objet, `createdAt` inclus
 * (converti en chaîne ISO — un `Date` traverse la frontière RSC, mais autant
 * rester explicite puisque le composant ne fait que l'afficher).
 */
export type AppointmentListItemDTO = {
  id: string;
  slotId: string;
  serviceId: string;
  subServiceId: string | null;
  clientEmail: string;
  clientName: string;
  clientPhone: string;
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
};

function toAppointmentListItemDTO({ appointment, slotDate, slotStartTime, slotEndTime }: AppointmentWithSlot): AppointmentListItemDTO {
  return {
    id: appointment.id,
    slotId: appointment.slotId,
    serviceId: appointment.serviceId,
    subServiceId: appointment.subServiceId,
    clientEmail: appointment.clientEmail,
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    notes: appointment.notes,
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
    slotDate,
    slotStartTime,
    slotEndTime,
  };
}

type ListResult = { success: true; appointments: AppointmentListItemDTO[] } | { success: false; error: string };
export type ConfirmResult = { success: true } | { success: false; error: string };
export type CancelResult = { success: true } | { success: false; error: string };
type ExportResult = { success: true; rows: AppointmentExportRow[] } | { success: false; error: string };

/**
 * Consultation des RDV — le client `server.ts` (session admin, pas service_role)
 * fait que le RLS applique directement `has_permission('appointments', 'view')`.
 *
 * Toute la fonction est dans un seul bloc try/catch : qu'une erreur vienne de
 * la validation, de l'authentification ou de la base, l'utilisateur ne voit
 * jamais qu'un message humain (cf. toUserMessage dans src/lib/errors.ts).
 */
export async function listAppointmentsAction(filters: unknown): Promise<ListResult> {
  try {
    const parsed = appointmentSearchFiltersSchema.safeParse(filters ?? {});
    if (!parsed.success) {
      return { success: false, error: 'Filtres invalides.' };
    }

    const supabase = await createClient();
    const useCase = new ListAppointments(new SupabaseAppointmentRepository(supabase));
    const appointments = await useCase.execute(parsed.data);
    return { success: true, appointments: appointments.map(toAppointmentListItemDTO) };
  } catch (error) {
    return { success: false, error: toUserMessage(error) };
  }
}

/**
 * Confirmation d'un RDV en attente par un admin/superadmin. La permission
 * 'appointments.edit' est vérifiée explicitement (comme pour l'export) plutôt
 * que de s'appuyer uniquement sur le RLS, pour retourner un message clair
 * côté UI plutôt qu'une erreur Postgres brute.
 */
export async function confirmAppointmentAction(appointmentId: unknown): Promise<ConfirmResult> {
  try {
    const parsedId = z.uuid().safeParse(appointmentId);
    if (!parsedId.success) {
      return { success: false, error: 'Rendez-vous invalide.' };
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'edit');

    const supabase = await createClient();
    const useCase = new ConfirmAppointment(
      new SupabaseAppointmentRepository(supabase),
      new ResendEmailProvider(),
      new SupabaseAuditLogger(),
    );

    await useCase.execute({
      appointmentId: parsedId.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}

/**
 * Annulation d'un RDV par un admin/superadmin, avec message optionnel
 * transmis au client dans l'email d'annulation. Même permission que la
 * confirmation ('appointments.edit') — les deux sont des transitions de
 * statut réservées à la même catégorie d'utilisateurs.
 */
export async function cancelAppointmentAction(input: unknown): Promise<CancelResult> {
  try {
    const parsed = cancelAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'edit');

    const supabase = await createClient();
    const useCase = new CancelAppointment(
      new SupabaseAppointmentRepository(supabase),
      new SupabaseSlotRepository(supabase),
      new ResendEmailProvider(),
      new SupabaseAuditLogger(),
    );

    await useCase.execute({
      appointmentId: parsed.data.appointmentId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
      reason: parsed.data.reason ?? null,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}

/**
 * Export Excel/CSV — le RLS ne distingue pas "consulter" d'"exporter" (même
 * requête SELECT du point de vue de Postgres). La permission 'export' est
 * donc vérifiée explicitement ici, avant même d'exécuter le use case.
 */
export async function exportAppointmentsAction(filters: unknown): Promise<ExportResult> {
  try {
    const parsed = appointmentSearchFiltersSchema.safeParse(filters ?? {});
    if (!parsed.success) {
      return { success: false, error: 'Filtres invalides.' };
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'export');

    const supabase = await createClient();
    const useCase = new ExportAppointments(new SupabaseAppointmentRepository(supabase), new SupabaseAuditLogger());

    const rows = await useCase.execute({
      filters: parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    return { success: true, rows };
  } catch (error) {
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}
