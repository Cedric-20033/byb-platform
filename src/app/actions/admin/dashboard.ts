'use server';

// src/app/actions/admin/dashboard.ts
import { GetDashboardStats, type DashboardStats } from '@/application/admin/GetDashboardStats';
import { GetUpcomingAppointments } from '@/application/admin/GetUpcomingAppointments';
import { GetAppointmentInsights, type AppointmentInsights } from '@/application/admin/GetAppointmentInsights';
import { GetFreeSlotsOutlook, type FreeSlotsOutlook } from '@/application/admin/GetFreeSlotsOutlook';
import { ListAppointments } from '@/application/admin/ListAppointments';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { createClient } from '@/infrastructure/supabase/server';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { getCurrentAdmin, assertPermission } from '@/lib/auth/getCurrentAdmin';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';

type StatsResult = { success: true; stats: DashboardStats } | ActionFailure;

export type NotificationItem = {
  id: string;
  clientName: string;
  serviceId: string;
  slotDate: string;
  slotStartTime: string;
};

type NotificationsResult =
  | { success: true; pendingCount: number; items: NotificationItem[] }
  | ActionFailure;

/**
 * Indicateurs de la page d'accueil du dashboard (cartes + graphique 14 jours).
 * Les chiffres sont dérivés des rendez-vous (données personnelles) : `appointments.view`
 * est exigée. Les créneaux bloqués qu'ils incluent sont déjà publics (RLS).
 */
export async function getDashboardStatsAction(): Promise<StatsResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'appointments', 'view');

    const supabase = await createClient();
    const useCase = new GetDashboardStats(
      new SupabaseAppointmentRepository(supabase),
      new SupabaseSlotRepository(supabase),
    );
    const stats = await useCase.execute();
    return { success: true, stats };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Alimente la cloche de notifications de la navbar : nombre de RDV en attente
 * de confirmation, et les plus récents pour l'aperçu du menu déroulant.
 * Expose des noms de clients : `appointments.view` est exigée.
 */
export async function getPendingNotificationsAction(): Promise<NotificationsResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'appointments', 'view');

    const supabase = await createClient();
    const useCase = new ListAppointments(new SupabaseAppointmentRepository(supabase));
    // Tri et limite côté base : « les 5 plus récentes » se calcule sur TOUTES les demandes en attente. Trier ici la
    // seule page renvoyée (triée par date de créneau) pouvait omettre une demande toute fraîche.
    const pending = await useCase.execute({
      filters: { status: AppointmentStatus.PENDING },
      sortField: 'createdAt',
      direction: 'desc',
      pageSize: 5,
    });

    const items: NotificationItem[] = pending.items
      .map(({ appointment, slotDate, slotStartTime }) => ({
        id: appointment.id,
        clientName: appointment.clientName,
        serviceId: appointment.serviceId,
        slotDate,
        slotStartTime,
      }));

    return { success: true, pendingCount: pending.total, items };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Vue minimale d'un rendez-vous pour le widget « Prochains rendez-vous » : le nom suffit à l'identifier,
 * l'email, le téléphone et les notes restent dans la fiche (principe de minimisation des données).
 */
export type UpcomingAppointmentDTO = {
  id: string;
  clientName: string;
  serviceId: string;
  status: AppointmentStatus;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
};

type UpcomingResult = { success: true; items: UpcomingAppointmentDTO[] } | ActionFailure;
type InsightsResult = { success: true; insights: AppointmentInsights } | ActionFailure;
type FreeSlotsResult = { success: true; outlook: FreeSlotsOutlook } | ActionFailure;

/** Prochains rendez-vous actifs. Données personnelles : `appointments.view` est exigée. */
export async function getUpcomingAppointmentsAction(): Promise<UpcomingResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'appointments', 'view');

    const supabase = await createClient();
    const upcoming = await new GetUpcomingAppointments(new SupabaseAppointmentRepository(supabase)).execute();

    return {
      success: true,
      items: upcoming.map(({ appointment, slotDate, slotStartTime, slotEndTime }) => ({
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

/** Taux d'annulation et répartition par service (agrégats dérivés des rendez-vous : `appointments.view`). */
export async function getAppointmentInsightsAction(): Promise<InsightsResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'appointments', 'view');

    const supabase = await createClient();
    const insights = await new GetAppointmentInsights(new SupabaseAppointmentRepository(supabase)).execute();
    return { success: true, insights };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Créneaux libres des 7 prochains jours. Ne lit que des créneaux, aucun rendez-vous : le droit exigé est
 * `slots.view`, de sorte qu'un admin sans accès aux rendez-vous peut quand même suivre les disponibilités.
 */
export async function getFreeSlotsOutlookAction(): Promise<FreeSlotsResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'slots', 'view');

    const supabase = await createClient();
    const outlook = await new GetFreeSlotsOutlook(new SupabaseSlotRepository(supabase)).execute();
    return { success: true, outlook };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
