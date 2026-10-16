// src/domain/appointment/ClientAppointmentAccess.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from './Appointment';
import { clientAppointmentState } from './ClientAppointmentAccess';

/** 15 octobre 2026, 10:00 à Bruxelles. */
const NOW = new Date('2026-10-15T10:00:00+02:00');
const future = { date: '2026-10-20', startTime: '09:00:00' };

describe('clientAppointmentState', () => {
  it.each([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])('un rendez-vous %s à venir est actif', (status) => {
    expect(clientAppointmentState(status, future, NOW)).toBe('active');
  });

  it('un rendez-vous annulé est annulé, même à venir', () => {
    expect(clientAppointmentState(AppointmentStatus.CANCELLED, future, NOW)).toBe('cancelled');
  });

  it('l\'annulation prime sur le passé', () => {
    expect(clientAppointmentState(AppointmentStatus.CANCELLED, { date: '2026-10-01', startTime: '09:00' }, NOW)).toBe(
      'cancelled',
    );
  });

  it('un créneau déjà commencé est passé', () => {
    expect(clientAppointmentState(AppointmentStatus.CONFIRMED, { date: '2026-10-15', startTime: '09:00:00' }, NOW)).toBe('past');
    expect(clientAppointmentState(AppointmentStatus.CONFIRMED, { date: '2026-10-15', startTime: '10:00:00' }, NOW)).toBe('past');
  });

  it('un créneau plus tard le même jour reste actif', () => {
    expect(clientAppointmentState(AppointmentStatus.CONFIRMED, { date: '2026-10-15', startTime: '10:01:00' }, NOW)).toBe('active');
  });
});
