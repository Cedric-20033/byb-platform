// src/components/admin/serviceLookup.ts
import type { Service, SubService } from '@/types';

export function findService(services: Service[], serviceId: string): Service | null {
  return services.find((service) => service.id === serviceId) ?? null;
}

/** Un service embarque ses sous-services (voir Service.subServices) — on les parcourt tous. */
export function findSubService(services: Service[], subServiceId: string): SubService | null {
  for (const service of services) {
    const match = service.subServices.find((sub) => sub.id === subServiceId);
    if (match) return match;
  }
  return null;
}
