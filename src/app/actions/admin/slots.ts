'use server';

// src/app/actions/admin/slots.ts
import { blockSlotSchema, generateAvailableSlotsSchema } from '@/lib/validation/appointment';
import { BlockSlot } from '@/application/admin/BlockSlot';
import { UnblockSlot } from '@/application/admin/UnblockSlot';
import { GenerateAvailableSlots } from '@/application/admin/GenerateAvailableSlots';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { SupabaseHolidayRepository } from '@/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission, toActorRole } from '@/lib/auth/getCurrentAdmin';

type SlotActionState = { success: true } | { success: false; error: string };

type GenerateSlotsActionState = { success: true; created: number } | { success: false; error: string };

/**
 * Bloquer/débloquer un créneau n'est pas accordé par défaut à un admin
 * (voir DEFAULT_ADMIN_PERMISSIONS : slots.edit = false) — seul le superadmin
 * l'a d'office ; il peut l'accorder à un admin depuis /dashboard/permissions.
 */
export async function blockSlotAction(input: unknown): Promise<SlotActionState> {
  const parsed = blockSlotSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Créneau invalide.' };

  const admin = await getCurrentAdmin();
  try {
    assertPermission(admin, 'slots', 'edit');
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Non autorisé.' };
  }

  const supabase = await createClient();
  const useCase = new BlockSlot(new SupabaseSlotRepository(supabase), new SupabaseAuditLogger());

  try {
    await useCase.execute({
      slotId: parsed.data.slotId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue.' };
  }
}

/**
 * Génère les créneaux réservables d'un service sur une période donnée.
 * Non accordé à un admin par défaut (slots.create = false dans
 * DEFAULT_ADMIN_PERMISSIONS) : seul le superadmin peut le faire tant qu'il
 * n'a pas explicitement étendu ce droit depuis /dashboard/permissions.
 */
export async function generateSlotsAction(input: unknown): Promise<GenerateSlotsActionState> {
  const parsed = generateAvailableSlotsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
  }

  const admin = await getCurrentAdmin();
  try {
    assertPermission(admin, 'slots', 'create');
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Non autorisé.' };
  }

  const supabase = await createClient();
  const useCase = new GenerateAvailableSlots(
    new SupabaseSlotRepository(supabase),
    new SupabaseHolidayRepository(supabase),
    new SupabaseAuditLogger(),
  );

  try {
    const created = await useCase.execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });
    return { success: true, created };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue.' };
  }
}

export async function unblockSlotAction(input: unknown): Promise<SlotActionState> {
  const parsed = blockSlotSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'Créneau invalide.' };

  const admin = await getCurrentAdmin();
  try {
    assertPermission(admin, 'slots', 'edit');
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Non autorisé.' };
  }

  const supabase = await createClient();
  const useCase = new UnblockSlot(new SupabaseSlotRepository(supabase), new SupabaseAuditLogger());

  try {
    await useCase.execute({
      slotId: parsed.data.slotId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue.' };
  }
}
