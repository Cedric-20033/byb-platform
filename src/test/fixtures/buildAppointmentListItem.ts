// src/test/fixtures/buildAppointmentListItem.ts
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import type { Service } from '@/types';

export const APPOINTMENT_ID = '22222222-2222-4222-8222-222222222222';
export const SERVICE_ID = '44444444-4444-4444-8444-444444444444';
export const SUB_SERVICE_ID = '55555555-5555-4555-8555-555555555555';

/** Rendez-vous de test en attente, rattaché à `buildServices()`. */
export function buildAppointmentListItem(overrides: Partial<AppointmentListItemDTO> = {}): AppointmentListItemDTO {
  return {
    id: APPOINTMENT_ID,
    slotId: '66666666-6666-4666-8666-666666666666',
    serviceId: SERVICE_ID,
    subServiceId: SUB_SERVICE_ID,
    clientEmail: 'alice@example.com',
    clientName: 'Alice Martin',
    clientPhone: '+32 470 12 34 56',
    notes: 'Prévoir une échelle',
    status: AppointmentStatus.PENDING,
    createdAt: '2026-10-05T10:00:00.000Z',
    slotDate: '2026-10-20',
    slotStartTime: '09:00:00',
    slotEndTime: '10:00:00',
    ...overrides,
  };
}

export function buildServices(): Service[] {
  return [
    {
      id: SERVICE_ID,
      slug: 'toiture',
      name: { fr: 'Toiture' },
      shortDescription: { fr: '' },
      fullDescription: { fr: '' },
      icon: 'Home',
      coverImage: '',
      galleryImages: [],
      videos: [],
      isActive: true,
      order: 0,
      subServices: [{ id: SUB_SERVICE_ID, slug: 'toiture-plate', name: { fr: 'Toiture plate' }, description: { fr: '' } }],
    },
  ];
}
