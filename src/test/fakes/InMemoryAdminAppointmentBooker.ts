// src/test/fakes/InMemoryAdminAppointmentBooker.ts
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import type { AdminAppointmentBooker, AdminBookingRequest } from '@/domain/appointment/AdminAppointmentBooker';
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { DomainError } from '@/domain/shared/DomainError';
import { TimeRange } from '@/domain/shared/TimeRange';

/**
 * Reproduit en mémoire le comportement de la fonction SQL `admin_create_appointment` :
 * réserver un créneau libre du bon service, ou créer un créneau ponctuel déjà réservé,
 * puis enregistrer le rendez-vous confirmé.
 */
export class InMemoryAdminAppointmentBooker implements AdminAppointmentBooker {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly appointmentRepository: AppointmentRepository,
  ) {}

  async bookConfirmed(request: AdminBookingRequest): Promise<Appointment> {
    const slotId = await this.reserveSlot(request);

    return this.appointmentRepository.save(
      new Appointment(
        '',
        slotId,
        request.serviceId,
        request.subServiceId,
        request.clientEmail,
        request.clientName,
        request.clientPhone,
        request.notes,
        AppointmentStatus.CONFIRMED,
        new Date(),
      ),
    );
  }

  private async reserveSlot({ slot, serviceId }: AdminBookingRequest): Promise<string> {
    if (slot.kind === 'adHoc') {
      const created = await this.slotRepository.save(
        new Slot('', slot.date, new TimeRange(slot.startTime, slot.endTime), SlotStatus.BOOKED, serviceId),
      );
      return created.id;
    }

    const existing = await this.slotRepository.findById(slot.slotId);
    if (!existing || !existing.canBeBooked() || existing.serviceId !== serviceId) {
      throw new DomainError('Créneau indisponible.', 'SLOT_UNAVAILABLE');
    }
    await this.slotRepository.updateStatus(existing.id, SlotStatus.BOOKED);
    return existing.id;
  }
}
