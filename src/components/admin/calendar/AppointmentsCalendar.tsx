// src/components/admin/calendar/AppointmentsCalendar.tsx
'use client';

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { de, enGB, fr } from 'date-fns/locale';
import { Calendar, dateFnsLocalizer, type Messages, type View } from 'react-big-calendar';
import { useTranslations } from 'next-intl';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar.css';
import { getCalendarDataAction } from '@/app/actions/admin/calendar';
import { AppointmentDetailsDialog } from '@/components/admin/AppointmentDetailsDialog';
import { findService } from '@/components/admin/serviceLookup';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import type { Locale } from '@/lib/routing';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { t as translateField } from '@/lib/utils';
import type { Service } from '@/types';
import {
  WEEK_STARTS_ON,
  buildCalendarEvents,
  getVisibleRange,
  type CalendarEvent,
  type CalendarView,
} from './calendarModel';

/** Les clés sont les locales de l'application ; l'anglais suit les usages britanniques (lundi, 24 h). */
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
  getDay,
  locales: { fr, en: enGB, de },
});

const VIEWS: View[] = ['month', 'week', 'day'];

/** Plage horaire des vues semaine et jour : celle d'un chantier, pas les 24 h. */
const DAY_START = new Date(1970, 0, 1, 7, 0);
const DAY_END = new Date(1970, 0, 1, 20, 0);

/** Classe CSS de l'événement : type, et statut pour un rendez-vous (voir calendar.css). */
function eventClassName(event: CalendarEvent): string {
  if (event.kind === 'appointment') {
    return event.appointment?.status === AppointmentStatus.PENDING ? 'bc-event--pending' : 'bc-event--confirmed';
  }
  return `bc-event--${event.kind}`;
}

/**
 * Calendrier admin : rendez-vous actifs, créneaux bloqués et jours fériés sur la période affichée.
 * Un clic sur un rendez-vous ouvre sa fiche en consultation ; les actions (confirmer, déplacer,
 * annuler…) restent dans la liste des rendez-vous.
 */
export function AppointmentsCalendar({ locale, services }: { locale: Locale; services: Service[] }) {
  const t = useTranslations('admin.calendar');
  const errorMessage = useErrorMessage();

  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('month');
  // L'id survit à la fermeture : la fiche garde son contenu pendant l'animation de sortie.
  const [selected, setSelected] = useState<{ id: string | null; open: boolean }>({ id: null, open: false });

  const range = getVisibleRange(date, view);

  /** `keepPreviousData` : la période précédente reste affichée pendant le chargement de la suivante. */
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['admin', 'calendar', range.from, range.to],
    queryFn: async () => unwrapAction(await getCalendarDataAction(range)),
    placeholderData: keepPreviousData,
  });

  const serviceName = (serviceId: string | null) => {
    if (!serviceId) return '';
    const service = findService(services, serviceId);
    return service ? translateField(service.name, locale) : '';
  };

  const events = useMemo(
    () =>
      data
        ? buildCalendarEvents(data, {
            appointment: (appointment) => t('appointmentTitle', { client: appointment.clientName, service: serviceName(appointment.serviceId) }),
            blocked: (slot) => t('blockedSlot', { service: serviceName(slot.serviceId) }),
          })
        : [],
    // `serviceName` ne dépend que de ces deux valeurs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, services, locale, t],
  );

  const messages: Messages = {
    today: t('toolbar.today'),
    previous: t('toolbar.previous'),
    next: t('toolbar.next'),
    month: t('toolbar.month'),
    week: t('toolbar.week'),
    day: t('toolbar.day'),
    allDay: t('allDay'),
    noEventsInRange: t('noEventsInRange'),
    showMore: (total) => t('showMore', { total }),
  };

  const selectedAppointment = data?.appointments.find((appointment) => appointment.id === selected.id) ?? null;

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-4 text-sm" aria-label={t('title')}>
        {(['pending', 'confirmed', 'blocked', 'holiday'] as const).map((kind) => (
          <li key={kind} className="flex items-center gap-2">
            <span aria-hidden="true" className={`inline-block size-3 rounded-sm bc-event--${kind}`} />
            {t(`legend.${kind}`)}
          </li>
        ))}
      </ul>

      {isError && (
        <p role="alert" className="text-sm text-[var(--color-secondary)]">
          {errorMessage(error)}
        </p>
      )}
      {isPending && <p className="text-sm text-[var(--color-muted)]">{t('loading')}</p>}

      <div style={{ height: 'min(78vh, 780px)' }}>
        <Calendar<CalendarEvent>
          localizer={localizer}
          culture={locale}
          events={events}
          startAccessor="start"
          endAccessor="end"
          allDayAccessor="allDay"
          titleAccessor="title"
          views={VIEWS}
          view={view}
          onView={(next) => setView(next as CalendarView)}
          date={date}
          onNavigate={setDate}
          min={DAY_START}
          max={DAY_END}
          popup
          messages={messages}
          eventPropGetter={(event) => ({ className: eventClassName(event) })}
          // Seuls les rendez-vous ont une fiche : créneaux bloqués et jours fériés sont informatifs.
          onSelectEvent={(event) => {
            if (event.appointment) setSelected({ id: event.appointment.id, open: true });
          }}
        />
      </div>

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={selected.open}
        onOpenChange={(open) => setSelected((current) => ({ ...current, open }))}
        locale={locale}
        services={services}
      />
    </div>
  );
}
