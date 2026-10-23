// src/app/[locale]/(public)/rdv/annuler/[token]/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CancelAppointmentPanel } from '@/components/booking/client/CancelAppointmentPanel';
import { ClientAppointmentNotice } from '@/components/booking/client/ClientAppointmentNotice';
import { ClientAppointmentPageShell } from '@/components/booking/client/ClientAppointmentPageShell';
import { toClientAppointmentPageView } from '@/lib/booking/clientAppointmentPageView';
import { loadClientAppointmentPage } from '@/lib/booking/loadClientAppointmentPage';
import type { Locale } from '@/lib/routing';

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Clés : clientAppointment.cancel.pageTitle, pageDescription
  const t = await getTranslations({ locale, namespace: 'clientAppointment.cancel' });
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    // Page personnelle : jamais indexée. Le jeton fait partie de l'URL, il ne doit pas non plus
    // fuiter dans l'en-tête Referer d'un lien sortant.
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/**
 * Annulation d'un rendez-vous depuis le lien de l'email. Le jeton de l'URL est la seule preuve d'identité ;
 * la page distingue lien invalide, rendez-vous déjà annulé, rendez-vous passé et rendez-vous annulable.
 */
export default async function CancelAppointmentPage({ params }: Props) {
  const { locale, token } = await params;
  const t = await getTranslations('clientAppointment.cancel');
  const view = toClientAppointmentPageView(await loadClientAppointmentPage(token, locale as Locale));

  return (
    <ClientAppointmentPageShell heading={t('heading')} intro={t('intro')}>
      {view.type === 'actionable' ? (
        <CancelAppointmentPanel token={token} summary={view.summary} />
      ) : (
        <ClientAppointmentNotice variant={view.variant} summary={view.summary} />
      )}
    </ClientAppointmentPageShell>
  );
}
