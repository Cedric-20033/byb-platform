'use server';

// src/app/actions/admin/appointments.ts
import {
  appointmentListQuerySchema,
  appointmentSearchFiltersSchema,
  cancelAppointmentSchema,
  createAppointmentByAdminSchema,
  rescheduleAppointmentSchema,
  updateAppointmentDetailsSchema,
} from '@/lib/validation/appointment';
import { ListAppointments } from '@/application/admin/ListAppointments';
import { ConfirmAppointment } from '@/application/admin/ConfirmAppointment';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { ExportAppointments, type AppointmentExportRow } from '@/application/admin/ExportAppointments';
import { CreateAppointmentByAdmin } from '@/application/admin/CreateAppointmentByAdmin';
import { DeleteAppointment } from '@/application/admin/DeleteAppointment';
import { GetAppointmentHistory } from '@/application/admin/GetAppointmentHistory';
import { RescheduleAppointment } from '@/application/admin/RescheduleAppointment';
import { UpdateAppointmentDetails } from '@/application/admin/UpdateAppointmentDetails';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseAdminAppointmentBooker } from '@/infrastructure/supabase/repositories/SupabaseAdminAppointmentBooker';
import { SupabaseAppointmentPlanner } from '@/infrastructure/supabase/repositories/SupabaseAppointmentPlanner';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { SupabaseAuditLogReader } from '@/infrastructure/supabase/repositories/SupabaseAuditLogReader';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { z } from 'zod';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
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

/** Une page de rendez-vous : `total` couvre toutes les pages, `page` est la page réellement servie. */
type ListResult =
  | { success: true; appointments: AppointmentListItemDTO[]; total: number; page: number; pageSize: number }
  | ActionFailure;
export type VoidResult = { success: true } | ActionFailure;
export type ConfirmResult = { success: true } | ActionFailure;
export type CancelResult = { success: true } | ActionFailure;
type ExportResult = { success: true; rows: AppointmentExportRow[] } | ActionFailure;
/** `AuditLogEntry` est un objet plat : il traverse tel quel la frontière Server Action → client. */
type HistoryResult = { success: true; entries: AuditLogEntry[] } | ActionFailure;
export type CreateByAdminResult = { success: true; appointmentId: string } | ActionFailure;

/**
 * Consultation des RDV. La permission `appointments.view` est vérifiée ici (code
 * `FORBIDDEN` clair côté UI) ; le client `server.ts` (session admin, pas
 * service_role) laisse le RLS l'appliquer aussi, en seconde barrière.
 *
 * Toute la fonction est dans un seul bloc try/catch : qu'une erreur vienne de
 * la validation, de l'authentification ou de la base, l'appelant ne reçoit
 * jamais qu'un code stable (cf. toErrorCode dans src/lib/errors.ts).
 */
export async function listAppointmentsAction(input: unknown): Promise<ListResult> {
  try {
    const parsed = appointmentListQuerySchema.safeParse(input ?? {});
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    assertPermission(await getCurrentAdmin(), 'appointments', 'view');

    const supabase = await createClient();
    const useCase = new ListAppointments(new SupabaseAppointmentRepository(supabase));
    const result = await useCase.execute({
      filters: parsed.data.filters,
      page: parsed.data.page,
      sortField: parsed.data.sort,
      direction: parsed.data.direction,
    });
    return {
      success: true,
      appointments: result.items.map(toAppointmentListItemDTO),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Confirmation d'un RDV en attente par un admin/superadmin. La permission
 * 'appointments.edit' est vérifiée explicitement (comme pour l'export) plutôt
 * que de s'appuyer uniquement sur le RLS, pour retourner un code clair
 * côté UI plutôt qu'une erreur Postgres brute.
 */
export async function confirmAppointmentAction(appointmentId: unknown): Promise<ConfirmResult> {
  try {
    const parsedId = z.uuid().safeParse(appointmentId);
    if (!parsedId.success) {
      return failure('VALIDATION_FAILED');
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
    return failure(toErrorCode(error));
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
      return failure('VALIDATION_FAILED');
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
    return failure(toErrorCode(error));
  }
}

/**
 * Export Excel/CSV — le RLS ne distingue pas "consulter" d'"exporter" (même
 * requête SELECT du point de vue de Postgres). La permission 'export' est
 * donc vérifiée explicitement ici, avant même d'exécuter le use case. 'view' est
 * exigée aussi : sans elle le RLS renverrait un export vide au lieu d'un refus clair.
 */
export async function exportAppointmentsAction(filters: unknown): Promise<ExportResult> {
  try {
    const parsed = appointmentSearchFiltersSchema.safeParse(filters ?? {});
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'view');
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
    return failure(toErrorCode(error));
  }
}

/**
 * Historique d'un RDV (fiche rendez-vous). Il est lu dans le journal d'audit : on exige donc
 * `audit_logs.view` EN PLUS de `appointments.view`, sans quoi cette action deviendrait un
 * contournement de la permission du journal. Le filtre (cible = ce RDV) est fixé par le use
 * case : l'appelant ne peut pas s'en servir pour lire autre chose que cet historique.
 */
export async function listAppointmentHistoryAction(appointmentId: unknown): Promise<HistoryResult> {
  try {
    const parsedId = z.uuid().safeParse(appointmentId);
    if (!parsedId.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'view');
    assertPermission(admin, 'audit_logs', 'view');

    const reader = new SupabaseAuditLogReader(await createClient());
    const entries = await new GetAppointmentHistory(reader).execute(parsedId.data);

    return { success: true, entries };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Création manuelle d'un rendez-vous par l'équipe : confirmé d'emblée, email au client, audit.
 *
 * Droits exigés : `appointments.create`, plus `appointments.view` (la fonction SQL lit la ligne
 * qu'elle insère, soumise à la policy de lecture : sans elle l'opération échouerait côté base
 * au lieu de renvoyer un refus clair). Un créneau ponctuel crée en plus un créneau :
 * `slots.create` est alors exigé aussi, et n'est donc demandé qu'à ce cas.
 */
export async function createAppointmentByAdminAction(input: unknown): Promise<CreateByAdminResult> {
  try {
    const parsed = createAppointmentByAdminSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'create');
    assertPermission(admin, 'appointments', 'view');
    if (parsed.data.slot.kind === 'adHoc') {
      assertPermission(admin, 'slots', 'create');
    }

    const supabase = await createClient();
    const useCase = new CreateAppointmentByAdmin(
      new SupabaseAdminAppointmentBooker(supabase),
      new SupabaseSlotRepository(supabase),
      new ResendEmailProvider(),
      new SupabaseAuditLogger(),
    );

    const appointment = await useCase.execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    return { success: true, appointmentId: appointment.id };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Déplacement d'un rendez-vous actif vers un autre créneau libre du même service (le client est prévenu).
 * `view` est exigé avec `edit` : la fonction SQL verrouille et relit la ligne, soumise à la policy de lecture.
 */
export async function rescheduleAppointmentAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = rescheduleAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'view');
    assertPermission(admin, 'appointments', 'edit');

    const supabase = await createClient();
    const useCase = new RescheduleAppointment(
      new SupabaseAppointmentRepository(supabase),
      new SupabaseSlotRepository(supabase),
      new SupabaseAppointmentPlanner(supabase),
      new ResendEmailProvider(),
      new SupabaseAuditLogger(),
    );

    await useCase.execute({ ...parsed.data, actorId: admin.id, actorRole: toActorRole(admin.role) });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/** Correction des coordonnées et des notes d'un rendez-vous actif (aucun email, audit sans valeurs). */
export async function updateAppointmentDetailsAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = updateAppointmentDetailsSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'view');
    assertPermission(admin, 'appointments', 'edit');

    const supabase = await createClient();
    const useCase = new UpdateAppointmentDetails(new SupabaseAppointmentRepository(supabase), new SupabaseAuditLogger());

    await useCase.execute({ ...parsed.data, actorId: admin.id, actorRole: toActorRole(admin.role) });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Suppression définitive d'un rendez-vous. Droit propre `appointments.delete` : il peut être accordé sans
 * `edit`. `view` est exigé aussi, la suppression relisant la ligne supprimée (RLS de lecture).
 */
export async function deleteAppointmentAction(appointmentId: unknown): Promise<VoidResult> {
  try {
    const parsedId = z.uuid().safeParse(appointmentId);
    if (!parsedId.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'view');
    assertPermission(admin, 'appointments', 'delete');

    const supabase = await createClient();
    const planner = new SupabaseAppointmentPlanner(supabase);
    const useCase = new DeleteAppointment(new SupabaseAppointmentRepository(supabase), planner, new SupabaseAuditLogger());

    await useCase.execute({ appointmentId: parsedId.data, actorId: admin.id, actorRole: toActorRole(admin.role) });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
