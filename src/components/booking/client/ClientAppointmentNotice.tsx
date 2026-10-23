// src/components/booking/client/ClientAppointmentNotice.tsx
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { LINK_BUTTON_CLASSES } from '@/components/ui/linkButtonClasses';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import type { ClientAppointmentNoticeVariant } from '@/lib/booking/clientAppointmentPageView';
import type { ClientAppointmentSummary } from '@/lib/booking/clientAppointmentSummary';
import { ClientAppointmentSummaryCard } from './ClientAppointmentSummaryCard';

type ClientAppointmentNoticeProps = {
  variant: ClientAppointmentNoticeVariant;
  /** Présent pour `cancelled` et `past` : le rendez-vous est connu, on le rappelle. */
  summary?: ClientAppointmentSummary;
};

/**
 * Pages « annuler » et « modifier » quand il n'y a rien à faire : lien invalide, trop de tentatives,
 * rendez-vous déjà annulé ou déjà passé. Chaque cas dit clairement ce qui se passe et propose la suite.
 */
export function ClientAppointmentNotice({ variant, summary }: ClientAppointmentNoticeProps) {
  const t = useTranslations('clientAppointment');
  const tErrors = useTranslations('errors.codes');
  const locale = useLocale() as Locale;

  if (variant === 'rateLimited') {
    return <p role="alert">{tErrors('TOO_MANY_ATTEMPTS')}</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-[var(--font-display)] font-bold mb-2">{t(`${variant}.title`)}</h2>
        <p className="text-[var(--color-muted)]">{t(`${variant}.message`)}</p>
      </div>

      {summary && <ClientAppointmentSummaryCard summary={summary} />}

      <div className="flex flex-wrap gap-3">
        {variant === 'invalid' ? (
          <Link href={getLocalizedPath('/contact', locale)} className={LINK_BUTTON_CLASSES}>
            {t('invalid.contact')}
          </Link>
        ) : (
          <Link href={getLocalizedPath('/rdv', locale)} className={LINK_BUTTON_CLASSES}>
            {t('bookAgain')}
          </Link>
        )}
      </div>
    </div>
  );
}
