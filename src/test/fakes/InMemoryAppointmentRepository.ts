// src/test/fakes/InMemoryAppointmentRepository.ts
import { Appointment, type AppointmentStatus } from '@/domain/appointment/Appointment';
import type {
  AppointmentRepository,
  AppointmentSearchFilters,
} from '@/domain/appointment/AppointmentRepository';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';

/**
 * Repository en mémoire. Reçoit le dépôt de créneaux pour pouvoir résoudre
 * la date d'un rendez-vous (filtres de période, `searchWithSlot`), comme le
 * fait la jointure SQL de l'implémentation Supabase.
 */
export class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly appointments = new Map<string, Appointment>();
  private sequence = 0;

  constructor(
    private readonly slotRepository: SlotRepository,
    initial: Appointment[] = [],
  ) {
    initial.forEach((appointment) => this.appointments.set(appointment.id, appointment));
  }

  async findById(id: string): Promise<Appointment | null> {
    return this.appointments.get(id) ?? null;
  }

  async findAll(): Promise<Appointment[]> {
    return this.all();
  }

  async search(filters: AppointmentSearchFilters): Promise<Appointment[]> {
    const results: Appointment[] = [];
    for (const appointment of this.all()) {
      if (await this.matches(appointment, filters)) results.push(appointment);
    }
    return results;
  }

  async searchWithSlot(filters: AppointmentSearchFilters): Promise<AppointmentWithSlot[]> {
    const results: AppointmentWithSlot[] = [];
    for (const appointment of await this.search(filters)) {
      const slot = await this.slotRepository.findById(appointment.slotId);
      if (!slot) continue;
      results.push({
        appointment,
        slotDate: slot.date,
        slotStartTime: slot.range.startTime,
        slotEndTime: slot.range.endTime,
      });
    }
    return results;
  }

  async save(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const saved = new Appointment(
      `appointment-${++this.sequence}`,
      appointment.slotId,
      appointment.serviceId,
      appointment.subServiceId,
      appointment.clientEmail,
      appointment.clientName,
      appointment.clientPhone,
      appointment.notes,
      appointment.status,
      new Date(),
    );
    this.appointments.set(saved.id, saved);
    return saved;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<void> {
    const current = this.appointments.get(id);
    if (!current) throw new Error(`Rendez-vous introuvable : ${id}`);
    this.appointments.set(
      id,
      new Appointment(
        current.id,
        current.slotId,
        current.serviceId,
        current.subServiceId,
        current.clientEmail,
        current.clientName,
        current.clientPhone,
        current.notes,
        status,
        current.createdAt,
      ),
    );
  }

  async delete(id: string): Promise<void> {
    this.appointments.delete(id);
  }

  /** Aide aux assertions : état complet du dépôt. */
  all(): Appointment[] {
    return [...this.appointments.values()];
  }

  private async matches(appointment: Appointment, filters: AppointmentSearchFilters): Promise<boolean> {
    if (filters.status && appointment.status !== filters.status) return false;
    if (filters.serviceId && appointment.serviceId !== filters.serviceId) return false;
    if (filters.clientEmail && appointment.clientEmail !== filters.clientEmail) return false;

    if (filters.dateFrom || filters.dateTo) {
      const slot = await this.slotRepository.findById(appointment.slotId);
      if (!slot) return false;
      if (filters.dateFrom && slot.date < filters.dateFrom) return false;
      if (filters.dateTo && slot.date > filters.dateTo) return false;
    }
    return true;
  }
}
