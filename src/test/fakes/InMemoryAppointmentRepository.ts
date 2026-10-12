// src/test/fakes/InMemoryAppointmentRepository.ts
import { Appointment, type AppointmentStatus } from '@/domain/appointment/Appointment';
import type {
  AppointmentContactDetails,
  AppointmentPage,
  AppointmentPageRequest,
  AppointmentRepository,
  AppointmentSearchFilters,
  AppointmentSortField,
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

  /** Même contrat que l'implémentation Supabase : tri, pagination, total sur l'ensemble filtré. */
  async searchPage(filters: AppointmentSearchFilters, request: AppointmentPageRequest): Promise<AppointmentPage> {
    const factor = request.direction === 'asc' ? 1 : -1;
    const sorted = [...(await this.searchWithSlot(filters))].sort(
      (a, b) => factor * compare(request.sortField, a, b) || a.appointment.id.localeCompare(b.appointment.id),
    );
    const start = (request.page - 1) * request.pageSize;
    return { items: sorted.slice(start, start + request.pageSize), total: sorted.length };
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

  async updateDetails(id: string, details: AppointmentContactDetails): Promise<void> {
    this.replace(id, (current) => this.rebuild(current, { ...details }));
  }

  async delete(id: string): Promise<void> {
    this.appointments.delete(id);
  }

  /** Aide aux tests : simule le changement de créneau fait atomiquement par la fonction SQL de replanification. */
  moveToSlot(id: string, slotId: string): void {
    this.replace(id, (current) => this.rebuild(current, { slotId }));
  }

  /** Aide aux assertions : état complet du dépôt. */
  all(): Appointment[] {
    return [...this.appointments.values()];
  }

  private async matches(appointment: Appointment, filters: AppointmentSearchFilters): Promise<boolean> {
    if (filters.status && appointment.status !== filters.status) return false;
    if (filters.serviceId && appointment.serviceId !== filters.serviceId) return false;
    if (filters.clientEmail && appointment.clientEmail !== filters.clientEmail) return false;
    if (filters.query?.trim()) {
      const needle = filters.query.trim().toLowerCase();
      const haystack = [appointment.clientName, appointment.clientEmail, appointment.clientPhone];
      if (!haystack.some((value) => value.toLowerCase().includes(needle))) return false;
    }

    if (filters.dateFrom || filters.dateTo) {
      const slot = await this.slotRepository.findById(appointment.slotId);
      if (!slot) return false;
      if (filters.dateFrom && slot.date < filters.dateFrom) return false;
      if (filters.dateTo && slot.date > filters.dateTo) return false;
    }
    return true;
  }

  private replace(id: string, build: (current: Appointment) => Appointment): void {
    const current = this.appointments.get(id);
    if (!current) throw new Error(`Rendez-vous introuvable : ${id}`);
    this.appointments.set(id, build(current));
  }

  /** Appointment est immuable : on reconstruit l'instance avec les champs modifiés. */
  private rebuild(
    current: Appointment,
    overrides: Partial<Pick<Appointment, 'slotId' | 'clientName' | 'clientEmail' | 'clientPhone' | 'notes'>>,
  ): Appointment {
    return new Appointment(
      current.id,
      overrides.slotId ?? current.slotId,
      current.serviceId,
      current.subServiceId,
      overrides.clientEmail ?? current.clientEmail,
      overrides.clientName ?? current.clientName,
      overrides.clientPhone ?? current.clientPhone,
      overrides.notes === undefined ? current.notes : overrides.notes,
      current.status,
      current.createdAt,
    );
  }
}

function compare(field: AppointmentSortField, a: AppointmentWithSlot, b: AppointmentWithSlot): number {
  switch (field) {
    case 'slotDate':
      return `${a.slotDate} ${a.slotStartTime}`.localeCompare(`${b.slotDate} ${b.slotStartTime}`);
    case 'clientName':
      return a.appointment.clientName.localeCompare(b.appointment.clientName);
    case 'status':
      return a.appointment.status.localeCompare(b.appointment.status);
    case 'createdAt':
      return a.appointment.createdAt.getTime() - b.appointment.createdAt.getTime();
  }
}
