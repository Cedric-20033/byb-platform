// src/lib/booking/clientAppointmentPageView.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { toClientAppointmentPageView } from './clientAppointmentPageView';
import type { ClientAppointmentSummary } from './clientAppointmentSummary';

const summary: ClientAppointmentSummary = {
  serviceId: 'svc-1',
  serviceName: 'Toiture',
  subServiceName: null,
  slotId: 'slot-1',
  date: '2026-10-20',
  startTime: '09:00',
  endTime: '10:00',
  status: AppointmentStatus.CONFIRMED,
};

describe('toClientAppointmentPageView', () => {
  it('propose l\'action pour un rendez-vous actif', () => {
    expect(toClientAppointmentPageView({ kind: 'found', state: 'active', summary })).toEqual({ type: 'actionable', summary });
  });

  it.each(['cancelled', 'past'] as const)('explique pourquoi il n\'y a rien à faire pour un rendez-vous %s', (state) => {
    expect(toClientAppointmentPageView({ kind: 'found', state, summary })).toEqual({ type: 'notice', variant: state, summary });
  });

  it.each(['invalid', 'rateLimited'] as const)('affiche un message « %s » sans rendez-vous', (kind) => {
    expect(toClientAppointmentPageView({ kind })).toEqual({ type: 'notice', variant: kind });
  });
});
