// src/components/admin/SlotsWeekView.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { listSlotsByRangeAction } from '@/app/actions/admin/slots';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SlotStatus } from '@/domain/slot/Slot';
import { addDays } from '@/domain/shared/IsoDate';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/lib/routing';
import { buildWeek, formatWeekdayLabel, startOfIsoWeek } from './slotsWeek';

const STATUS_TONE = {
  [SlotStatus.AVAILABLE]: 'success',
  [SlotStatus.BOOKED]: 'info',
  [SlotStatus.BLOCKED]: 'danger',
} as const;

type SlotsWeekViewProps = {
  locale: Locale;
  serviceId: string;
  /** Un jour quelconque de la semaine affichée. */
  date: string;
  onDateChange: (date: string) => void;
  /** Ouvre le détail d'une journée (vue jour), où l'on bloque ou débloque chaque créneau. */
  onOpenDay: (date: string) => void;
};

/**
 * Vue d'ensemble d'une semaine de créneaux (lundi au dimanche) pour un service : repérer d'un coup d'oeil
 * les trous, les journées pleines et les blocages. Lecture seule : l'action sur un créneau se fait en vue jour.
 */
export function SlotsWeekView({ locale, serviceId, date, onDateChange, onOpenDay }: SlotsWeekViewProps) {
  const t = useTranslations('admin.slots');
  const errorMessage = useErrorMessage();

  const weekStart = startOfIsoWeek(date);
  const weekEnd = addDays(weekStart, 6);

  // Clé sous ['admin', 'slots'] : bloquer, générer ou supprimer en lot rafraîchit aussi cette vue.
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['admin', 'slots', 'week', weekStart, serviceId],
    queryFn: async () =>
      unwrapAction(await listSlotsByRangeAction({ from: weekStart, to: weekEnd, serviceId: serviceId || undefined })).slots,
  });

  const week = buildWeek(data ?? [], weekStart);
  const isEmpty = data?.length === 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" variant="outline" aria-label={t('previousWeek')} onClick={() => onDateChange(addDays(weekStart, -7))}>
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <p className="text-sm font-semibold text-center">
          {t('weekOf', { from: formatDate(weekStart, locale), to: formatDate(weekEnd, locale) })}
        </p>
        <Button size="sm" variant="outline" aria-label={t('nextWeek')} onClick={() => onDateChange(addDays(weekStart, 7))}>
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>

      {isError && (
        <p role="alert" className="text-sm text-[var(--color-secondary)]">
          {errorMessage(error)}
        </p>
      )}
      {isPending && <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('title')}…</p>}
      {isEmpty && <p className="text-sm text-[var(--color-muted)] text-center">{t('noSlotsWeek')}</p>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {week.map((day) => (
            <section key={day.date} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-2 min-w-0">
              <button
                type="button"
                onClick={() => onOpenDay(day.date)}
                aria-label={t('openDay', { date: formatDate(day.date, locale) })}
                className="w-full text-left text-xs font-semibold uppercase tracking-wide hover:text-[var(--color-primary)]"
              >
                {formatWeekdayLabel(day.date, locale)}
              </button>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5 mb-2">
                {t('weekCounts', { available: day.counts.available, booked: day.counts.booked, blocked: day.counts.blocked })}
              </p>

              <ul className="space-y-1">
                {day.slots.map((slot) => (
                  <li key={slot.id}>
                    <Badge tone={STATUS_TONE[slot.status as SlotStatus]} className="w-full justify-center tabular-nums">
                      {slot.startTime.slice(0, 5)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
