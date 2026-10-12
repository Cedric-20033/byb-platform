'use server';

// src/app/actions/admin/calendar.ts
import { GetCalendarRange } from '@/application/admin/GetCalendarRange';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseHolidayRepository } from '@/infrastructure/supabase/repositories/SupabaseHolidayRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { createClient } from '@/infrastructure/supabase/server';
import { getCurrentAdmin, assertPermission } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { calendarRangeSchema } from '@/lib/validation/appointment';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';

export type CalendarBlockedSlotDTO = { id: string; serviceId: string | null; date: string; startTime: string; endTime: string };
export type CalendarHolidayDTO = { date: string; label: string };

export type CalendarDataDTO = {
  appointments: AppointmentListItemDTO[];
  blockedSlots: CalendarBlockedSlotDTO[];
  holidays: CalendarHolidayDTO[];
};

type CalendarResult = ({ success: true } & CalendarDataDTO) | ActionFailure;

/**
 * Données du calendrier sur une période.
 *
 * Le droit d'entrée est `appointments.view` (le calendrier est une vue des rendez-vous). Les créneaux
 * bloqués et les jours fériés sont des couches en plus : chacune n'est lue que si l'admin possède le
 * droit de consultation correspondant (`slots.view`, `holidays.view`) ; sinon elle est simplement vide,
 * sans erreur, et le calendrier reste utilisable.
 */
export async function getCalendarDataAction(input: unknown): Promise<CalendarResult> {
  try {
    const parsed = calendarRangeSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'appointments', 'view');

    const supabase = await createClient();
    const useCase = new GetCalendarRange(
      new SupabaseAppointmentRepository(supabase),
      new SupabaseSlotRepository(supabase),
      new SupabaseHolidayRepository(supabase),
    );

    const range = await useCase.execute({
      ...parsed.data,
      layers: { blockedSlots: admin.can('slots', 'view'), holidays: admin.can('holidays', 'view') },
    });

    return {
      success: true,
      appointments: range.appointments.map(({ appointment, slotDate, slotStartTime, slotEndTime }) => ({
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
      })),
      blockedSlots: range.blockedSlots.map((slot) => ({
        id: slot.id,
        serviceId: slot.serviceId,
        date: slot.date,
        startTime: slot.range.startTime,
        endTime: slot.range.endTime,
      })),
      holidays: range.holidays,
    };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
