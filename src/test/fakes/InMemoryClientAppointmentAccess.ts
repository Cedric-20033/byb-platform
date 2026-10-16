// src/test/fakes/InMemoryClientAppointmentAccess.ts
import type { ClientAppointmentAccess, ClientAppointmentView } from '@/domain/appointment/ClientAppointmentAccess';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import type { InMemoryAppointmentRepository } from './InMemoryAppointmentRepository';

export const TEST_TOKEN = '3f2b8c1e-5a4d-4e7b-9c3a-1d2e3f4a5b6c';

/**
 * Accès par jeton en mémoire. Relit le rendez-vous et son créneau à chaque appel, comme la jointure SQL :
 * un rendez-vous déplacé ou annulé est vu à jour.
 */
export class InMemoryClientAppointmentAccess implements ClientAppointmentAccess {
  private readonly tokens = new Map<string, string>();

  constructor(
    private readonly appointmentRepository: InMemoryAppointmentRepository,
    private readonly slotRepository: SlotRepository,
  ) {}

  /** Associe un jeton à un rendez-vous, comme le fait la colonne `access_token` à la création. */
  issueToken(appointmentId: string, token: string = TEST_TOKEN): string {
    this.tokens.set(token, appointmentId);
    return token;
  }

  async findByToken(token: string): Promise<ClientAppointmentView | null> {
    const appointmentId = this.tokens.get(token);
    if (!appointmentId) return null;

    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) return null;
    const slot = await this.slotRepository.findById(appointment.slotId);
    if (!slot) return null;

    return {
      appointment,
      slot: { id: slot.id, date: slot.date, startTime: slot.range.startTime, endTime: slot.range.endTime },
    };
  }
}
