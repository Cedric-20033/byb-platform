'use server';

// src/app/actions/booking/getAvailableSlots.ts
import { getAvailableSlotsSchema } from '@/lib/validation/appointment';
import { GetAvailableSlots } from '@/application/booking/GetAvailableSlots';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { SupabaseHolidayRepository } from '@/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { createClient } from '@/infrastructure/supabase/server';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';

/**
 * DTO traversant la frontière Server Action → Client Component.
 *
 * Important : un Server Action sérialise sa valeur de retour pour l'envoyer
 * au client — les méthodes des classes du domaine (Slot.isAvailable(), etc.)
 * ne survivent PAS ce passage, seuls les champs de données le font. On expose
 * donc explicitement un type plat plutôt que de prétendre renvoyer `Slot[]`.
 */
export type SlotDTO = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string | null;
};

export type GetAvailableSlotsActionState =
  | { success: true; slots: SlotDTO[] }
  | ActionFailure;

/**
 * Lecture publique — le RLS autorise déjà l'accès anonyme à `slots`/`holidays`
 * (nécessaire pour le calendrier temps réel). Pas besoin du client service_role
 * ici : contrairement à la création/l'annulation, aucune donnée personnelle
 * n'est en jeu.
 */
export async function getAvailableSlotsAction(input: unknown): Promise<GetAvailableSlotsActionState> {
  try {
    const parsed = getAvailableSlotsSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const supabase = await createClient();

    const useCase = new GetAvailableSlots(
      new SupabaseSlotRepository(supabase),
      new SupabaseHolidayRepository(supabase),
    );

    const slots = await useCase.execute(parsed.data);

    const dto: SlotDTO[] = slots.map((slot) => ({
      id: slot.id,
      date: slot.date,
      startTime: slot.range.startTime,
      endTime: slot.range.endTime,
      serviceId: slot.serviceId,
    }));

    return { success: true, slots: dto };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
