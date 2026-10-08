// src/domain/service/ServiceUsageReader.ts

/**
 * Port de lecture : ce qui dépend d'un service ailleurs dans le système.
 * Séparé de `ServiceRepository` (ISP) : seul `DeleteService` en a besoin.
 */
export interface ServiceUsageReader {
  /** `true` si au moins un rendez-vous, quel que soit son statut, référence ce service. */
  hasAppointments(serviceId: string): Promise<boolean>;
}
