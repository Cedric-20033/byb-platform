'use server';

// src/app/actions/admin/holidays.ts
import { z } from 'zod';
import { getTranslations } from 'next-intl/server';
import {
  createHolidayRequestSchema,
  createHolidaySchema,
  importBelgianHolidaysSchema,
} from '@/lib/validation/appointment';
import { CreateHoliday } from '@/application/admin/CreateHoliday';
import { DeleteHoliday } from '@/application/admin/DeleteHoliday';
import { FindHolidayConflicts } from '@/application/admin/FindHolidayConflicts';
import { ImportBelgianHolidays } from '@/application/admin/ImportBelgianHolidays';
import { ListHolidays } from '@/application/admin/ListHolidays';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { BELGIAN_HOLIDAY_KEYS, type BelgianHolidayKey } from '@/domain/holiday/BelgianHolidays';
import { SupabaseHolidayRepository } from '@/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { routing } from '@/lib/routing';
import type { AppointmentStatus } from '@/domain/appointment/Appointment';
import type { Holiday } from '@/domain/holiday/Holiday';

const deleteHolidaySchema = z.object({ holidayId: z.uuid() });

/**
 * DTO plat : `Holiday` est une classe (méthode `appliesTo()`), donc non
 * sérialisable à travers la frontière Server Action → Client Component,
 * même si tous ses champs sont des primitives (Next.js rejette l'instance
 * à cause de son prototype, pas à cause de la forme des données).
 */
export type HolidayDTO = {
  id: string;
  date: string;
  /** Dernier jour inclus ; égal à `date` pour un jour unique. */
  endDate: string;
  label: string;
  isRecurring: boolean;
};

function toHolidayDTO(holiday: Holiday): HolidayDTO {
  return {
    id: holiday.id,
    date: holiday.date,
    endDate: holiday.endDate,
    label: holiday.label,
    isRecurring: holiday.isRecurring,
  };
}

/** Rendez-vous touché par un congé : le strict nécessaire pour que l'admin décide (pas d'email, pas de téléphone). */
export type HolidayConflictDTO = {
  id: string;
  clientName: string;
  serviceId: string;
  status: AppointmentStatus;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
};

type ListResult = { success: true; holidays: HolidayDTO[] } | ActionFailure;
type PreviewResult = { success: true; conflicts: HolidayConflictDTO[] } | ActionFailure;
type CreateResult =
  | {
      success: true;
      holiday: HolidayDTO;
      ignoredCount: number;
      cancelledCount: number;
      failedCount: number;
    }
  | ActionFailure;
type ImportResult = { success: true; created: number; skipped: number; ignoredConflicts: number } | ActionFailure;
type DeleteResult = { success: true } | ActionFailure;

/**
 * Lecture pour le dashboard. Le RLS laisse les jours fériés lisibles de tous (le
 * calendrier public en a besoin), mais l'écran d'administration reste soumis à
 * `holidays.view`, comme la page qui l'affiche.
 */
export async function listHolidaysAction(): Promise<ListResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'holidays', 'view');

    const supabase = await createClient();
    const useCase = new ListHolidays(new SupabaseHolidayRepository(supabase));
    const holidays = await useCase.execute();
    return { success: true, holidays: holidays.map(toHolidayDTO) };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/** Assemble le use case de création : partagé par la création unitaire et l'import en lot. */
function buildCreateHoliday(supabase: Awaited<ReturnType<typeof createClient>>): CreateHoliday {
  const appointments = new SupabaseAppointmentRepository(supabase);
  const auditLogger = new SupabaseAuditLogger();
  return new CreateHoliday(
    new SupabaseHolidayRepository(supabase),
    new FindHolidayConflicts(appointments),
    new CancelAppointment(appointments, new SupabaseSlotRepository(supabase), new ResendEmailProvider(), auditLogger),
    auditLogger,
  );
}

/**
 * Aperçu AVANT création : les rendez-vous qu'un congé ferait tomber un jour de fermeture. Lecture seule,
 * accordée à qui peut créer un congé. Les rendez-vous sont lus avec les droits de l'admin (RLS) : sans
 * `appointments.view`, l'aperçu est vide, et la création ne peut pas non plus les annuler.
 */
export async function previewHolidayConflictsAction(input: unknown): Promise<PreviewResult> {
  try {
    const parsed = createHolidaySchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    assertPermission(await getCurrentAdmin(), 'holidays', 'create');

    const supabase = await createClient();
    const finder = new FindHolidayConflicts(new SupabaseAppointmentRepository(supabase));
    const conflicts = await finder.execute({
      date: parsed.data.date,
      endDate: parsed.data.endDate ?? parsed.data.date,
      isRecurring: parsed.data.isRecurring,
    });

    return {
      success: true,
      conflicts: conflicts.map(({ appointment, slotDate, slotStartTime, slotEndTime }) => ({
        id: appointment.id,
        clientName: appointment.clientName,
        serviceId: appointment.serviceId,
        status: appointment.status,
        slotDate,
        slotStartTime,
        slotEndTime,
      })),
    };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Création d'un congé. Annuler les rendez-vous touchés (`resolution.mode === 'cancel'`) est une action
 * sur les rendez-vous : elle exige en plus `appointments.view` et `appointments.edit`, et n'est donc
 * demandée que dans ce cas. Sans résolution, le use case refuse si des rendez-vous sont touchés.
 */
export async function createHolidayAction(input: unknown): Promise<CreateResult> {
  try {
    const parsed = createHolidayRequestSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'holidays', 'create');
    if (parsed.data.resolution?.mode === 'cancel') {
      assertPermission(admin, 'appointments', 'view');
      assertPermission(admin, 'appointments', 'edit');
    }

    const supabase = await createClient();
    const result = await buildCreateHoliday(supabase).execute({
      ...parsed.data.holiday,
      resolution: parsed.data.resolution,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    return {
      success: true,
      holiday: toHolidayDTO(result.holiday),
      ignoredCount: result.ignoredCount,
      cancelledCount: result.cancelledCount,
      failedCount: result.failedCount,
    };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Importe les jours fériés belges d'une année. Les libellés sont enregistrés dans la langue de l'interface
 * de l'admin (un libellé de congé est un texte libre en base, comme ceux saisis à la main).
 */
export async function importBelgianHolidaysAction(input: unknown): Promise<ImportResult> {
  try {
    const parsed = importBelgianHolidaysSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'holidays', 'create');

    const locale = routing.locales.find((candidate) => candidate === parsed.data.locale) ?? routing.defaultLocale;
    const t = await getTranslations({ locale, namespace: 'admin.holidays.belgian' });
    const labels = Object.fromEntries(BELGIAN_HOLIDAY_KEYS.map((key) => [key, t(key)])) as Record<BelgianHolidayKey, string>;

    const supabase = await createClient();
    const useCase = new ImportBelgianHolidays(new SupabaseHolidayRepository(supabase), buildCreateHoliday(supabase));
    const result = await useCase.execute({
      year: parsed.data.year,
      labels,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    return { success: true, ...result };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function deleteHolidayAction(input: unknown): Promise<DeleteResult> {
  try {
    const parsed = deleteHolidaySchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'holidays', 'delete');

    const supabase = await createClient();
    const useCase = new DeleteHoliday(new SupabaseHolidayRepository(supabase), new SupabaseAuditLogger());

    await useCase.execute({
      holidayId: parsed.data.holidayId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
