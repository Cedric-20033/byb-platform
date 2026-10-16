// src/lib/booking/clientAppointmentSummary.test.ts
import { describe, expect, it } from 'vitest';
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import type { ClientAppointmentView } from '@/domain/appointment/ClientAppointmentAccess';
import { buildService, buildSubService } from '@/test/fixtures/catalog';
import { toClientAppointmentSummary } from './clientAppointmentSummary';

const toiture = buildService('toiture', [buildSubService('plate')]);
toiture.id = 'svc-1';
toiture.name = { fr: 'Toiture', en: 'Roofing' };
toiture.subServices[0].id = 'sub-1';
toiture.subServices[0].name = { fr: 'Toiture plate', en: 'Flat roof' };

const view = (subServiceId: string | null, serviceId = 'svc-1'): ClientAppointmentView => ({
  appointment: new Appointment(
    'apt-1',
    'slot-1',
    serviceId,
    subServiceId,
    'alice@example.com',
    'Alice Martin',
    '+32 470 12 34 56',
    null,
    AppointmentStatus.CONFIRMED,
    new Date('2026-10-01T10:00:00Z'),
  ),
  slot: { id: 'slot-1', date: '2026-10-20', startTime: '09:00:00', endTime: '10:00:00' },
});

describe('toClientAppointmentSummary', () => {
  it('traduit le service et la prestation dans la langue du visiteur', () => {
    expect(toClientAppointmentSummary(view('sub-1'), [toiture], 'en')).toMatchObject({
      serviceId: 'svc-1',
      serviceName: 'Roofing',
      subServiceName: 'Flat roof',
    });
  });

  it('formate le créneau sans les secondes', () => {
    expect(toClientAppointmentSummary(view(null), [toiture], 'fr')).toMatchObject({
      slotId: 'slot-1',
      date: '2026-10-20',
      startTime: '09:00',
      endTime: '10:00',
      status: AppointmentStatus.CONFIRMED,
    });
  });

  it('n\'expose ni les coordonnées du client ni un jeton', () => {
    const summary = JSON.stringify(toClientAppointmentSummary(view(null), [toiture], 'fr'));

    expect(summary).not.toContain('alice@example.com');
    expect(summary).not.toContain('Alice');
    expect(summary).not.toContain('+32');
  });

  it('sans sous-prestation, n\'en affiche pas', () => {
    expect(toClientAppointmentSummary(view(null), [toiture], 'fr').subServiceName).toBeNull();
  });

  it('laisse vide le nom d\'un service introuvable plutôt que d\'en inventer un', () => {
    expect(toClientAppointmentSummary(view('sub-1', 'svc-supprime'), [toiture], 'fr')).toMatchObject({
      serviceName: '',
      subServiceName: null,
    });
  });

  it('se replie sur le français quand la traduction manque', () => {
    expect(toClientAppointmentSummary(view('sub-1'), [toiture], 'de').serviceName).toBe('Toiture');
  });
});
