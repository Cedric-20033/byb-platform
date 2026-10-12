// src/components/admin/NotificationBell.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';
import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import type { Locale } from '@/lib/routing';
import { getLocalizedPath } from '@/lib/routing';
import { ADMIN_ROUTES } from '@/lib/constants';
import type { Service } from '@/types';
import { getPendingNotificationsAction } from '@/app/actions/admin/dashboard';
import { cn, formatDate, t as translateField } from '@/lib/utils';
import { buildOpenAppointmentQuery } from './appointmentsUrlState';
import { useAppointmentsRealtime } from './useAppointmentsRealtime';

/** Vues qui affichent des rendez-vous : toutes sont rafraîchies quand un rendez-vous change. */
const APPOINTMENT_QUERY_KEYS = [
  ['admin', 'notifications'],
  ['admin', 'appointments'],
  ['admin', 'calendar'],
  ['admin', 'dashboard'],
] as const;

/**
 * Cloche de notifications : signale les RDV en attente de confirmation.
 *
 * Mise à jour en TEMPS RÉEL par Supabase Realtime (voir useAppointmentsRealtime) : un rendez-vous demandé,
 * confirmé ou annulé rafraîchit la cloche, les listes, le calendrier et les statistiques, et une nouvelle demande
 * affiche un toast. L'interrogation toutes les 2 minutes reste comme filet de sécurité : une connexion Realtime
 * peut se couper sans prévenir (réseau mobile, veille de l'ordinateur).
 * `services` provient du layout admin (Server Component, Supabase) — ce
 * composant client ne touche jamais data/ ni le repository directement.
 */
export function NotificationBell({ services }: { services: Service[] }) {
  const t = useTranslations('admin.navbar');
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useAppointmentsRealtime((change) => {
    for (const queryKey of APPOINTMENT_QUERY_KEYS) queryClient.invalidateQueries({ queryKey });

    // Une demande publique naît « pending » ; un rendez-vous créé par l'équipe est confirmé d'office, et ne notifie pas.
    if (change.eventType === 'INSERT' && change.newRow?.status === 'pending') {
      toast.info(t('newAppointmentToast', { client: String(change.newRow.client_name ?? '') }));
    }
  });

  const { data } = useQuery({
    queryKey: ['admin', 'notifications', 'pending'],
    queryFn: async () => {
      const result = await getPendingNotificationsAction();
      if (!result.success) throw new Error(result.error);
      return result;
    },
    refetchInterval: 120_000,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingCount = data?.pendingCount ?? 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('notifications')}
        className="relative w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)] transition-colors"
      >
        <Bell size={18} />
        {pendingCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-secondary)] text-white text-[10px] font-bold flex items-center justify-center">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute right-0 mt-2 w-80 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
              'bg-[var(--color-surface)] shadow-[var(--shadow-lg)] z-50 overflow-hidden',
            )}
          >
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <p className="text-sm font-semibold">{t('notifications')}</p>
              {pendingCount > 0 && (
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {pendingCount} {t('pendingAppointments')}
                </p>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {!data || data.items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">{t('noNotifications')}</p>
              ) : (
                data.items.map((item) => {
                  const service = services.find((s) => s.id === item.serviceId) ?? null;
                  return (
                    <Link
                      key={item.id}
                      href={`${getLocalizedPath(ADMIN_ROUTES.APPOINTMENTS, locale)}?${buildOpenAppointmentQuery(item.id)}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-[var(--color-surface-raised)] transition-colors border-b border-[var(--color-border)] last:border-0"
                    >
                      <p className="text-sm font-medium">{item.clientName}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {t('notificationMeta', {
                          service: service ? translateField(service.name, locale) : item.serviceId,
                          date: formatDate(item.slotDate, locale),
                          time: item.slotStartTime,
                        })}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
