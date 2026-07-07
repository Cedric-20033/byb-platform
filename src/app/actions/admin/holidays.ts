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
import type { Holiday } from '@/domain/holiday/Holiday';

const deleteHolidaySchema = z.object({ holidayId: z.uuid() });

type ListResult = { success: true; holidays: Holiday[] } | { success: false; error: string };
type CreateResult = { success: true; holiday: Holiday } | { success: false; error: string };
type DeleteResult = { success: true } | { success: false; error: string };

/**
 * Lecture publique du dashboard — le RLS autorise déjà la lecture des jours
 * fériés à tout authentifié ; pas de vérification de permission supplémentaire
 * nécessaire pour un simple affichage.
 */
export async function listHolidaysAction(): Promise<ListResult> {
  const supabase = await createClient();
  const useCase = new ListHolidays(new SupabaseHolidayRepository(supabase));
  const holidays = await useCase.execute();
  return { success: true, holidays };
}

export async function createHolidayAction(input: unknown): Promise<CreateResult> {
  const parsed = createHolidaySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const admin = await getCurrentAdmin();
  try {
    assertPermission(admin, 'holidays', 'create');
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Non autorisé.' };
  }

  const supabase = await createClient();
  const useCase = new CreateHoliday(new SupabaseHolidayRepository(supabase), new SupabaseAuditLogger());

  const holiday = await useCase.execute({
    ...parsed.data,
    actorId: admin.id,
    actorRole: toActorRole(admin.role),
  });

  return { success: true, holiday };
}

export async function deleteHolidayAction(input: unknown): Promise<DeleteResult> {
  const parsed = deleteHolidaySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Identifiant invalide.' };

  const admin = await getCurrentAdmin();
  try {
    assertPermission(admin, 'holidays', 'delete');
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Non autorisé.' };
  }

  const supabase = await createClient();
  const useCase = new DeleteHoliday(new SupabaseHolidayRepository(supabase), new SupabaseAuditLogger());

  await useCase.execute({
    holidayId: parsed.data.holidayId,
    actorId: admin.id,
    actorRole: toActorRole(admin.role),
  });

  return { success: true };
}
