// src/domain/appointment/AppointmentRepository.ts
import type { Appointment } from './Appointment';

/**
 * Port de sortie : contrat que toute implémentation de persistance doit respecter.
 *
 * Le domaine et l'application ne connaissent que cette interface.
 * Supabase, une API REST, ou une base SQLite l'implémentent depuis l'infrastructure.
 *
 * Principe D de SOLID : on dépend de l'abstraction, pas du détail.
 */
export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findAll(): Promise<Appointment[]>;
  save(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment>;
  updateStatus(id: string, status: Appointment['status']): Promise<void>;
  delete(id: string): Promise<void>;
}