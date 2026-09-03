'use server';

// src/app/actions/admin/slots.ts
import { z } from 'zod';
import { blockSlotSchema, generateAvailableSlotsSchema } from '@/lib/validation/appointment';
import { BlockSlot } from '@/application/admin/BlockSlot';
import { UnblockSlot } from '@/application/admin/UnblockSlot';
import { GenerateAvailableSlots } from '@/application/admin/GenerateAvailableSlots';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { SupabaseHolidayRepository } from '@/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { toUserMessage, PERMISSION_DENIED_MESSAGE } from '@/lib/errors';
import type { Slot, SlotStatus } from '@/domain/slot/Slot';

type SlotActionState = { success: true } | { success: false; error: string };

type GenerateSlotsActionState = { success: true; created: number } | { success: false; error: string };

const listSlotsByDateSchema = z.object({
  date: z.iso.date({ error: 'Date invalide (format attendu : AAAA-MM-JJ).' }),
  serviceId: z.string().optional(),
});

/**
 * DTO plat : un Server Action ne peut renvoyer que des objets sérialisables
 * au Client Component qui l'appelle. L'entité `Slot` (classe, avec un objet
 * `TimeRange` imbriqué) ne l'est pas — Next.js rejette explicitement les
 * instances de classe à la frontière RSC ("Classes ... are not supported").
 */
export type SlotDTO = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  serviceId: string | null;
};

function toSlotDTO(slot: Slot): SlotDTO {
  return {
    id: slot.id,
    date: slot.date,
    startTime: slot.range.startTime,
    endTime: slot.range.endTime,
    status: slot.status,
    serviceId: slot.serviceId,
  };
}

type ListSlotsResult = { success: true; slots: SlotDTO[] } | { success: false; error: string };

/**
 * Liste les créneaux d'une journée pour l'écran admin "Créneaux" — lecture
 * simple, aucune permission dédiée (voir listHolidaysAction pour la même convention).
 */
export async function listSlotsByDateAction(input: unknown): Promise<ListSlotsResult> {
  try {
    const parsed = listSlotsByDateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Date invalide.' };

    const supabase = await createClient();
    const repository = new SupabaseSlotRepository(supabase);
    const slots = await repository.findByDate(parsed.data.date);

    const filtered = parsed.data.serviceId
      ? slots.filter((slot) => slot.serviceId === parsed.data.serviceId)
      : slots;

    const sorted = filtered.sort((a, b) => a.range.startTime.localeCompare(b.range.startTime));
    return { success: true, slots: sorted.map(toSlotDTO) };
  } catch (error) {
    return { success: false, error: toUserMessage(error) };
  }
}

/**
 * Bloquer/débloquer un créneau n'est pas accordé par défaut à un admin
 * (voir DEFAULT_ADMIN_PERMISSIONS : slots.edit = false) — seul le superadmin
 * l'a d'office ; il peut l'accorder à un admin depuis /dashboard/permissions.
 */
export async function blockSlotAction(input: unknown): Promise<SlotActionState> {
  try {
    const parsed = blockSlotSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Créneau invalide.' };

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'slots', 'edit');

    const supabase = await createClient();
    const useCase = new BlockSlot(new SupabaseSlotRepository(supabase), new SupabaseAuditLogger());

    await useCase.execute({
      slotId: parsed.data.slotId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}

/**
 * Génère les créneaux réservables d'un service sur une période donnée.
 * Non accordé à un admin par défaut (slots.create = false dans
 * DEFAULT_ADMIN_PERMISSIONS) : seul le superadmin peut le faire tant qu'il
 * n'a pas explicitement étendu ce droit depuis /dashboard/permissions.
 */
export async function generateSlotsAction(input: unknown): Promise<GenerateSlotsActionState> {
  try {
    const parsed = generateAvailableSlotsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides.' };
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'slots', 'create');

    const supabase = await createClient();
    const useCase = new GenerateAvailableSlots(
      new SupabaseSlotRepository(supabase),
      new SupabaseHolidayRepository(supabase),
      new SupabaseAuditLogger(),
    );

    const created = await useCase.execute({
      ...parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });
    return { success: true, created };
  } catch (error) {
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}

export async function unblockSlotAction(input: unknown): Promise<SlotActionState> {
  try {
    const parsed = blockSlotSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Créneau invalide.' };

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'slots', 'edit');

    const supabase = await createClient();
    const useCase = new UnblockSlot(new SupabaseSlotRepository(supabase), new SupabaseAuditLogger());

    await useCase.execute({
      slotId: parsed.data.slotId,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: toUserMessage(error, PERMISSION_DENIED_MESSAGE) };
  }
}
