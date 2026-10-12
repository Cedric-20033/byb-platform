// src/test/fakes/InMemoryAppointmentPlanner.ts
import type { AppointmentRemover } from '@/domain/appointment/AppointmentRemover';
import type { AppointmentRescheduler } from '@/domain/appointment/AppointmentRescheduler';
import { SlotStatus } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { DomainError } from '@/domain/shared/DomainError';
import type { InMemoryAppointmentRepository } from './InMemoryAppointmentRepository';

/**
 * Reproduit en mémoire les fonctions SQL `reschedule_appointment` et `delete_appointment` :
 * mêmes vérifications, même résultat sur les créneaux et le rendez-vous.
 */
export class InMemoryAppointmentPlanner implements AppointmentRescheduler, AppointmentRemover {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly appointmentRepository: InMemoryAppointmentRepository,
  ) {}

  async reschedule(appointmentId: string, newSlotId: string): Promise<void> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) throw new DomainError('Rendez-vous introuvable.', 'APPOINTMENT_NOT_FOUND');
    if (!appointment.isActive()) throw new DomainError('Rendez-vous annulé.', 'INVALID_STATUS_TRANSITION');

    const target = await this.slotRepository.findById(newSlotId);
    if (!target || target.id === appointment.slotId || !target.canBeBooked() || target.serviceId !== appointment.serviceId) {
      throw new DomainError('Créneau indisponible.', 'SLOT_UNAVAILABLE');
    }

    await this.slotRepository.updateStatus(target.id, SlotStatus.BOOKED);
    this.appointmentRepository.moveToSlot(appointment.id, target.id);
    await this.slotRepository.updateStatus(appointment.slotId, SlotStatus.AVAILABLE);
  }

  async remove(appointmentId: string): Promise<void> {
    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) throw new DomainError('Rendez-vous introuvable.', 'APPOINTMENT_NOT_FOUND');

    await this.appointmentRepository.delete(appointment.id);
    if (appointment.isActive()) {
      await this.slotRepository.updateStatus(appointment.slotId, SlotStatus.AVAILABLE);
    }
  }
}
