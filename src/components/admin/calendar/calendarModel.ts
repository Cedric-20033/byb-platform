// src/components/admin/calendar/calendarModel.ts
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import type { CalendarBlockedSlotDTO, CalendarDataDTO } from '@/app/actions/admin/calendar';

export type CalendarView = 'month' | 'week' | 'day';
export type CalendarEventKind = 'appointment' | 'blocked' | 'holiday';

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  kind: CalendarEventKind;
  /** Présent pour un rendez-vous : sert à ouvrir sa fiche et à colorer l'événement selon son statut. */
  appointment?: AppointmentListItemDTO;
};

/** Les semaines commencent le lundi (usage belge). */
export const WEEK_STARTS_ON = 1;

/**
 * « AAAA-MM-JJ » d'une date locale. `toISOString()` est volontairement évité : il convertit en UTC et
 * décalerait d'un jour les dates de début de journée dans les fuseaux à l'est de Greenwich.
 */
export function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Date locale « heure du mur » depuis une date et une heure calendaires. Les rendez-vous sont à l'heure de
 * Bruxelles : on affiche l'heure telle qu'elle est enregistrée, quel que soit le fuseau du navigateur.
 */
export function toWallClockDate(isoDate: string, time = '00:00:00'): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Période à charger pour afficher la vue : pour un mois, les semaines complètes qui le recouvrent
 * (les jours du mois voisin visibles dans la grille doivent aussi être renseignés).
 */
export function getVisibleRange(date: Date, view: CalendarView): { from: string; to: string } {
  const options = { weekStartsOn: WEEK_STARTS_ON } as const;
  switch (view) {
    case 'month':
      return {
        from: toLocalIsoDate(startOfWeek(startOfMonth(date), options)),
        to: toLocalIsoDate(endOfWeek(endOfMonth(date), options)),
      };
    case 'week':
      return { from: toLocalIsoDate(startOfWeek(date, options)), to: toLocalIsoDate(endOfWeek(date, options)) };
    case 'day':
      return { from: toLocalIsoDate(date), to: toLocalIsoDate(date) };
  }
}

type EventTitles = {
  appointment: (appointment: AppointmentListItemDTO) => string;
  blocked: (slot: CalendarBlockedSlotDTO) => string;
};

/** Transforme les données serveur en événements du calendrier ; les libellés sont fournis par l'appelant (i18n). */
export function buildCalendarEvents(data: CalendarDataDTO, titles: EventTitles): CalendarEvent[] {
  const appointments = data.appointments.map<CalendarEvent>((appointment) => ({
    id: `appointment-${appointment.id}`,
    title: titles.appointment(appointment),
    start: toWallClockDate(appointment.slotDate, appointment.slotStartTime),
    end: toWallClockDate(appointment.slotDate, appointment.slotEndTime),
    allDay: false,
    kind: 'appointment',
    appointment,
  }));

  const blocked = data.blockedSlots.map<CalendarEvent>((slot) => ({
    id: `blocked-${slot.id}`,
    title: titles.blocked(slot),
    start: toWallClockDate(slot.date, slot.startTime),
    end: toWallClockDate(slot.date, slot.endTime),
    allDay: false,
    kind: 'blocked',
  }));

  // Un événement « toute la journée » se termine à minuit du lendemain (borne exclusive).
  const holidays = data.holidays.map<CalendarEvent>((holiday) => ({
    id: `holiday-${holiday.date}`,
    title: holiday.label,
    start: toWallClockDate(holiday.date),
    end: addDays(toWallClockDate(holiday.date), 1),
    allDay: true,
    kind: 'holiday',
  }));

  return [...holidays, ...appointments, ...blocked];
}
