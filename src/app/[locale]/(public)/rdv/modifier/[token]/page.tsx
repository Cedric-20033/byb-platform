// src/app/[locale]/(public)/rdv/modifier/[token]/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ClientAppointmentNotice } from '@/components/booking/client/ClientAppointmentNotice';
import { ClientAppointmentPageShell } from '@/components/booking/client/ClientAppointmentPageShell';
import { RescheduleAppointmentPanel } from '@/components/booking/client/RescheduleAppointmentPanel';
import { toClientAppointmentPageView } from '@/lib/booking/clientAppointmentPageView';
import { loadClientAppointmentPage } from '@/lib/booking/loadClientAppointmentPage';
import type { Locale } from '@/lib/routing';

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Clés : clientAppointment.reschedule.pageTitle, pageDescription
  const t = await getTranslations({ locale, namespace: 'clientAppointment.reschedule' });
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/**
 * Modification d'un rendez-vous depuis le lien de l'email : même service, nouveau créneau.
 * Mêmes états que la page d'annulation (lien invalide, déjà annulé, passé) avant de proposer la grille.
 */
export default async function RescheduleAppointmentPage({ params }: Props) {
  const { locale, token } = await params;
  const t = await getTranslations('clientAppointment.reschedule');
  const view = toClientAppointmentPageView(await loadClientAppointmentPage(token, locale as Locale));

  return (
    <ClientAppointmentPageShell heading={t('heading')} intro={t('intro')}>
      {view.type === 'actionable' ? (
        <RescheduleAppointmentPanel token={token} summary={view.summary} />
      ) : (
        <ClientAppointmentNotice variant={view.variant} summary={view.summary} />
      )}
    </ClientAppointmentPageShell>
  );
}
