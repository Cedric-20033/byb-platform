'use server';

// src/app/actions/admin/holidays.ts
import { z } from 'zod';
import { createHolidaySchema } from '@/lib/validation/appointment';
import { CreateHoliday } from '@/application/admin/CreateHoliday';
import { DeleteHoliday } from '@/application/admin/DeleteHoliday';
import { ListHolidays } from '@/application/admin/ListHolidays';
import { SupabaseHolidayRepository } from '@/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { toUserMessage, PERMISSION_DENIED_MESSAGE } from '@/lib/errors';
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
  label: string;
  isRecurring: boolean;
};

function toHolidayDTO(holiday: Holiday): HolidayDTO {
  return { id: holiday.id, date: holiday.date, label: holiday.label, isRecurring: holiday.isRecurring };
}

type ListResult = { success: true; holidays: HolidayDTO[] } | { success: false; error: string };
type CreateResult = { success: true; holiday: HolidayDTO } | { success: false; error: string };
type DeleteResult = { success: true } | { success: false; error: string };

/**
 * Lecture publique du dashboard — le RLS autorise déjà la lecture des jours
 * fériés à tout authentifié ; pas de vérification de permission supplémentaire
 * nécessaire pour un simple affichage.
 */
export async function listHolidaysAction(): Promise<ListResult> {
  try {
    const supabase = await createClient();
    const useCase = new ListHolidays(new SupabaseHolidayRepository(supabase));
    const holidays = await useCase.execute();
    return { success: true, holidays: holidays.map(toHolidayDTO) };
  } catch (error) {
    return { success: false, error: toUserMessage(error) };
  }
}

export async function createHolidayAction(input: unknown): Promise<CreateResult> {
  try {
    const parsed = createHolidaySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'holidays', 'create');

    const supabase = await createClient();
    const useCase = new CreateHoliday(new SupabaseHolidayRepository(supabase), new SupabaseAuditLogger());

    const holiday = await useCase.execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    return { success: true, holiday: toHolidayDTO(holiday) };
  } catch (error) {
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}

export async function deleteHolidayAction(input: unknown): Promise<DeleteResult> {
  try {
    const parsed = deleteHolidaySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Identifiant invalide.' };

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
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}
