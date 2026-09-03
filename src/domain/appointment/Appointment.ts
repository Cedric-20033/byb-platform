// src/domain/appointment/Appointment.ts

/**
 * Entité métier centrale : le Rendez-vous.
 *
 * Cette classe contient UNIQUEMENT les règles métier pures.
 * Elle ne connaît ni Supabase, ni Next.js, ni aucun outil externe.
 * Si une règle métier change (ex: délai d'annulation), on ne modifie que ce fichier.
 */
export class Appointment {
  constructor(
    public readonly id: string,
    public readonly slotId: string,
    public readonly serviceId: string,
    public readonly subServiceId: string | null,
    public readonly clientEmail: string,
    public readonly clientName: string,
    public readonly clientPhone: string,
    public readonly notes: string | null,
    public readonly status: AppointmentStatus,
    public readonly createdAt: Date,
  ) {}

  /**
   * Un rendez-vous peut être annulé uniquement s'il est en statut 'confirmed' ou 'pending'.
   * Règle métier : on ne peut pas annuler ce qui est déjà annulé.
   */
  canBeCancelled(): boolean {
    return this.status === AppointmentStatus.CONFIRMED || this.status === AppointmentStatus.PENDING;
  }

  /**
   * Un rendez-vous peut être confirmé uniquement s'il est en attente.
   */
  canBeConfirmed(): boolean {
    return this.status === AppointmentStatus.PENDING;
  }

  /**
   * Valide qu'une transition de statut est autorisée par les règles métier.
   * Centralise la matrice des transitions interdites (ex: réanuler un RDV déjà annulé,
   * confirmer un RDV déjà confirmé). Les use cases appellent cette méthode avant
   * de persister un changement de statut.
   */
  assertCanTransitionTo(newStatus: AppointmentStatus): void {
    const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.CONFIRMED]: [AppointmentStatus.CANCELLED],
      [AppointmentStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[this.status].includes(newStatus)) {
      throw new Error(`Transition de statut interdite : ${this.status} → ${newStatus}`);
    }
  }
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}
