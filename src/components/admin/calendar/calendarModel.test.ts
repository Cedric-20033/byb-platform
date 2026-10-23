// src/components/admin/calendar/calendarModel.test.ts
import { describe, expect, it } from 'vitest';
import type { CalendarDataDTO } from '@/app/actions/admin/calendar';
import { buildAppointmentListItem } from '@/test/fixtures/buildAppointmentListItem';
import { buildCalendarEvents, getVisibleRange, toLocalIsoDate, toWallClockDate } from './calendarModel';

describe('toLocalIsoDate', () => {
  it('lit la date locale, sans décalage de fuseau', () => {
    // 23 h 30 en heure locale : en UTC (toISOString) ce serait déjà, ou encore, un autre jour selon le fuseau.
    expect(toLocalIsoDate(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
    expect(toLocalIsoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('toWallClockDate', () => {
  it('conserve l\'heure telle qu\'enregistrée, quel que soit le fuseau', () => {
    const date = toWallClockDate('2026-10-20', '09:30:00');

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()]).toEqual([2026, 9, 20, 9, 30]);
  });

  it('prend minuit par défaut', () => {
    expect(toWallClockDate('2026-10-20').getHours()).toBe(0);
  });
});

describe('getVisibleRange', () => {
  it('couvre pour un mois les semaines complètes (lundi au dimanche) qui le recouvrent', () => {
    // Octobre 2026 : du jeudi 1er au samedi 31.
    expect(getVisibleRange(new Date(2026, 9, 14), 'month')).toEqual({ from: '2026-09-28', to: '2026-11-01' });
  });

  it('couvre pour une semaine du lundi au dimanche', () => {
    expect(getVisibleRange(new Date(2026, 9, 14), 'week')).toEqual({ from: '2026-10-12', to: '2026-10-18' });
  });

  it('couvre pour un jour ce seul jour', () => {
    expect(getVisibleRange(new Date(2026, 9, 14), 'day')).toEqual({ from: '2026-10-14', to: '2026-10-14' });
  });

  it('ne dépasse jamais le plafond accepté par le serveur (62 jours)', () => {
    for (let month = 0; month < 12; month++) {
      const { from, to } = getVisibleRange(new Date(2026, month, 15), 'month');
      expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBeLessThanOrEqual(62);
    }
  });
});

describe('buildCalendarEvents', () => {
  const data: CalendarDataDTO = {
    appointments: [buildAppointmentListItem({ id: 'a1', slotDate: '2026-10-20', slotStartTime: '09:00:00', slotEndTime: '10:00:00' })],
    blockedSlots: [{ id: 'b1', serviceId: 's1', date: '2026-10-21', startTime: '14:00:00', endTime: '15:00:00' }],
    holidays: [{ date: '2026-12-25', label: 'Noël' }],
  };
  const events = buildCalendarEvents(data, {
    appointment: (appointment) => `RDV ${appointment.clientName}`,
    blocked: (slot) => `Bloqué ${slot.serviceId}`,
  });

  it('transforme les rendez-vous, avec leur fiche attachée', () => {
    const appointment = events.find((event) => event.kind === 'appointment');

    expect(appointment).toMatchObject({ id: 'appointment-a1', title: 'RDV Alice Martin', allDay: false });
    expect(appointment?.appointment?.id).toBe('a1');
    expect(appointment?.start.getHours()).toBe(9);
    expect(appointment?.end.getHours()).toBe(10);
  });

  it('transforme les créneaux bloqués, sans fiche', () => {
    const blocked = events.find((event) => event.kind === 'blocked');

    expect(blocked).toMatchObject({ id: 'blocked-b1', title: 'Bloqué s1', allDay: false });
    expect(blocked?.appointment).toBeUndefined();
  });

  it('transforme un jour férié en événement sur la journée entière, de minuit à minuit', () => {
    const holiday = events.find((event) => event.kind === 'holiday');

    expect(holiday).toMatchObject({ id: 'holiday-2026-12-25', title: 'Noël', allDay: true });
    expect(toLocalIsoDate(holiday!.start)).toBe('2026-12-25');
    expect(toLocalIsoDate(holiday!.end)).toBe('2026-12-26');
  });

  it('ne produit aucun événement pour des données vides', () => {
    expect(buildCalendarEvents({ appointments: [], blockedSlots: [], holidays: [] }, { appointment: () => '', blocked: () => '' })).toEqual([]);
  });
});
