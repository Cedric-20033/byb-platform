'use server';

// src/app/actions/admin/dashboard.ts
import { GetDashboardStats, type DashboardStats } from '@/application/admin/GetDashboardStats';
import { ListAppointments } from '@/application/admin/ListAppointments';
import { SupabaseAppointmentRepository } from '@/infrastructure/supabase/repositories/SupabaseAppointmentRepository';
import { SupabaseSlotRepository } from '@/infrastructure/supabase/repositories/SupabaseSlotRepository';
import { createClient } from '@/infrastructure/supabase/server';
import { AppointmentStatus } from '@/domain/appointment/Appointment';

type StatsResult = { success: true; stats: DashboardStats } | { success: false; error: string };

export type NotificationItem = {
  id: string;
  clientName: string;
  serviceId: string;
  slotDate: string;
  slotStartTime: string;
};

type NotificationsResult =
  | { success: true; pendingCount: number; items: NotificationItem[] }
  | { success: false; error: string };

/**
 * Indicateurs de la page d'accueil du dashboard (cartes + graphique 14 jours).
 * Lecture seule, accessible à tout admin authentifié (le RLS filtre déjà
 * ce qu'un profil peut voir ; aucune permission dédiée n'est nécessaire ici).
 */
export async function getDashboardStatsAction(): Promise<StatsResult> {
  const supabase = await createClient();
  const useCase = new GetDashboardStats(
    new SupabaseAppointmentRepository(supabase),
    new SupabaseSlotRepository(supabase),
  );
  const stats = await useCase.execute();
  return { success: true, stats };
}

/**
 * Alimente la cloche de notifications de la navbar : nombre de RDV en attente
 * de confirmation, et les plus récents pour l'aperçu du menu déroulant.
 */
export async function getPendingNotificationsAction(): Promise<NotificationsResult> {
  const supabase = await createClient();
  const useCase = new ListAppointments(new SupabaseAppointmentRepository(supabase));
  const pending = await useCase.execute({ status: AppointmentStatus.PENDING });

  const items: NotificationItem[] = pending
    .sort((a, b) => b.appointment.createdAt.getTime() - a.appointment.createdAt.getTime())
    .slice(0, 5)
    .map(({ appointment, slotDate, slotStartTime }) => ({
      id: appointment.id,
      clientName: appointment.clientName,
      serviceId: appointment.serviceId,
      slotDate,
      slotStartTime,
    }));

  return { success: true, pendingCount: pending.length, items };
}
