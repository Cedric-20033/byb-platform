// src/infrastructure/email/buildAppointmentEmail.tsx
import { render } from '@react-email/components';
import { toAppointmentLocale, type AppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import { EmailType, type EmailPayload } from '@/domain/shared/EmailProvider';
import { company, getPrimarySite } from '@/data/company';
import { formatIsoDate } from '@/lib/date';
import type { AppointmentEmailContext } from './AppointmentEmailContext';
import { buildIcs } from './appointmentIcs';
import { buildBookUrl, buildClientLinks } from './clientLinks';
import { createEmailTranslator, type EmailTranslator } from './emailTranslator';
import { TransactionalEmail, type EmailAction, type EmailDetailRow } from './TransactionalEmail';

export type EmailAttachment = { filename: string; content: string; contentType: string };
export type BuiltEmail = { subject: string; html: string; attachments: EmailAttachment[] };

type SlotSummary = { date: string; startTime: string; endTime?: string };
type AppointmentSummary = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string | null;
  locale?: unknown;
};

/** Ce qui distingue les emails entre eux ; tout le reste (mise en page, détails) est commun. */
type TemplateSpec = {
  /** Espace de noms dans `emails.*` : `subject`, `preview`, `heading`, `intro`. */
  namespace: string;
  audience: 'client' | 'admin';
  /** Liens « modifier » et « annuler » (jeton du rendez-vous). */
  manageLinks?: boolean;
  /** Lien « reprendre rendez-vous ». */
  rebookLink?: boolean;
  /** Joint un fichier calendrier .ics. */
  calendarFile?: boolean;
  /** Affiche l'ancien et le nouveau créneau plutôt que le créneau courant. */
  slotChange?: boolean;
  /** Affiche le motif transmis par l'équipe. */
  reason?: boolean;
  /** Filtre du dashboard ouvert par le bouton des emails destinés à l'équipe. */
  dashboardStatus?: 'pending' | 'cancelled';
};

const SPECS: Partial<Record<EmailType, TemplateSpec>> = {
  [EmailType.APPOINTMENT_CONFIRMATION]: { namespace: 'appointmentConfirmation', audience: 'client', manageLinks: true },
  [EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN]: {
    namespace: 'appointmentConfirmedByAdmin',
    audience: 'client',
    manageLinks: true,
    calendarFile: true,
  },
  [EmailType.APPOINTMENT_CANCELLATION]: {
    namespace: 'appointmentCancellation',
    audience: 'client',
    rebookLink: true,
    reason: true,
  },
  [EmailType.APPOINTMENT_RESCHEDULED]: {
    namespace: 'appointmentRescheduled',
    audience: 'client',
    manageLinks: true,
    calendarFile: true,
    slotChange: true,
  },
  [EmailType.APPOINTMENT_REMINDER]: { namespace: 'appointmentReminder', audience: 'client', manageLinks: true },
  [EmailType.ADMIN_NEW_APPOINTMENT]: {
    namespace: 'adminNewAppointment',
    audience: 'admin',
    dashboardStatus: 'pending',
  },
  [EmailType.ADMIN_APPOINTMENT_CANCELLED_BY_CLIENT]: {
    namespace: 'adminAppointmentCancelledByClient',
    audience: 'admin',
    dashboardStatus: 'cancelled',
  },
  [EmailType.ADMIN_APPOINTMENT_RESCHEDULED_BY_CLIENT]: {
    namespace: 'adminAppointmentRescheduledByClient',
    audience: 'admin',
    slotChange: true,
  },
};

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

/** Les emails d'invitation (admin) ont leur propre rendu : seuls les emails de rendez-vous passent par ici. */
export function isAppointmentEmail(type: EmailType): boolean {
  return type in SPECS;
}

/**
 * Langue de l'email : celle du client pour ses emails (portée par le rendez-vous, donc stable dans le
 * temps), toujours le français pour ceux de l'équipe.
 */
export function resolveEmailLocale(payload: EmailPayload): AppointmentLocale {
  if (SPECS[payload.type]?.audience === 'admin') return 'fr';
  const appointment = payload.data.appointment as { locale?: unknown } | undefined;
  return toAppointmentLocale(payload.locale ?? appointment?.locale);
}

function timeRange(t: EmailTranslator, slot: SlotSummary): string {
  const start = slot.startTime.slice(0, 5);
  return slot.endTime ? t('common.timeRange', { start, end: slot.endTime.slice(0, 5) }) : start;
}

function describeSlot(t: EmailTranslator, locale: AppointmentLocale, slot: SlotSummary): string {
  return `${formatIsoDate(slot.date, locale, LONG_DATE)}, ${timeRange(t, slot)}`;
}

function clientRows(t: EmailTranslator, appointment: AppointmentSummary): EmailDetailRow[] {
  return [
    { label: t('common.fields.client'), value: appointment.clientName },
    { label: t('common.fields.email'), value: appointment.clientEmail },
    { label: t('common.fields.phone'), value: appointment.clientPhone },
    ...(appointment.notes ? [{ label: t('common.fields.notes'), value: appointment.notes }] : []),
  ];
}

function slotRows(
  t: EmailTranslator,
  locale: AppointmentLocale,
  spec: TemplateSpec,
  payload: EmailPayload,
  currentSlot: SlotSummary | null,
): EmailDetailRow[] {
  if (spec.slotChange) {
    const previous = payload.data.previousSlot as SlotSummary | null | undefined;
    const next = payload.data.newSlot as SlotSummary | undefined;
    return [
      ...(previous ? [{ label: t('common.fields.previousSlot'), value: describeSlot(t, locale, previous) }] : []),
      ...(next ? [{ label: t('common.fields.newSlot'), value: describeSlot(t, locale, next) }] : []),
    ];
  }
  if (!currentSlot) return [];
  return [
    { label: t('common.fields.date'), value: formatIsoDate(currentSlot.date, locale, LONG_DATE) },
    { label: t('common.fields.time'), value: timeRange(t, currentSlot) },
  ];
}

/**
 * Compose un email de rendez-vous : objet, HTML et pièce jointe éventuelle, dans la langue du destinataire.
 *
 * Retourne `null` pour un type qui n'est pas un email de rendez-vous. `context` peut être `null`
 * (rendez-vous introuvable ou lecture en échec) : l'email part alors sans service, sans liens et sans
 * .ics, car prévenir le client vaut mieux que ne rien envoyer.
 */
export async function buildAppointmentEmail(
  payload: EmailPayload,
  context: AppointmentEmailContext | null,
  options: { baseUrl: string; now?: Date },
): Promise<BuiltEmail | null> {
  const spec = SPECS[payload.type];
  if (!spec) return null;

  const locale = resolveEmailLocale(payload);
  const t = createEmailTranslator(locale);
  const ns = spec.namespace;
  const appointment = payload.data.appointment as AppointmentSummary;
  const now = options.now ?? new Date();

  // Créneau courant : celui de la base, ou à défaut celui que le use case a joint (nouvelle demande).
  const fallbackSlot =
    typeof payload.data.slotDate === 'string' && typeof payload.data.slotStartTime === 'string'
      ? { date: payload.data.slotDate, startTime: payload.data.slotStartTime }
      : null;
  const currentSlot = context?.slot ?? fallbackSlot;

  const reason = spec.reason ? (payload.data.reason as string | null | undefined) : null;
  const details: EmailDetailRow[] = [
    ...(spec.audience === 'admin' ? clientRows(t, appointment) : []),
    ...(context
      ? [
          { label: t('common.fields.service'), value: context.serviceName },
          ...(context.subServiceName ? [{ label: t('common.fields.subService'), value: context.subServiceName }] : []),
        ]
      : []),
    ...slotRows(t, locale, spec, payload, currentSlot),
    ...(reason ? [{ label: t('common.fields.reason'), value: reason }] : []),
  ];

  const actions: EmailAction[] = [];
  let actionsIntro: string | undefined;
  if (spec.manageLinks && context) {
    const links = buildClientLinks(options.baseUrl, locale, context.accessToken);
    actionsIntro = t('common.manageIntro');
    actions.push(
      { label: t('common.rescheduleAction'), url: links.rescheduleUrl, primary: true },
      { label: t('common.cancelAction'), url: links.cancelUrl },
    );
  }
  if (spec.rebookLink) {
    actions.push({ label: t('common.rebookAction'), url: buildBookUrl(options.baseUrl, locale), primary: true });
  }
  if (spec.audience === 'admin') {
    const query = spec.dashboardStatus ? `status=${spec.dashboardStatus}&` : '';
    actions.push({
      label: t('common.dashboardAction'),
      url: `${options.baseUrl}/fr/dashboard/appointments?${query}open=${encodeURIComponent(appointment.id)}`,
      primary: true,
    });
  }

  const attachments: EmailAttachment[] = [];
  if (spec.calendarFile && context) {
    const site = getPrimarySite();
    attachments.push({
      filename: 'rendez-vous.ics',
      contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
      content: buildIcs({
        uid: `${appointment.id}@byb-construction`,
        summary: t('common.calendarSummary', { company: company.name, service: context.serviceName }),
        description: context.subServiceName ?? undefined,
        location: `${site.address.street}, ${site.address.postalCode} ${site.address.city}`,
        date: context.slot.date,
        startTime: context.slot.startTime,
        endTime: context.slot.endTime,
        stamp: now,
      }),
    });
  }

  const html = await render(
    <TransactionalEmail
      lang={locale}
      preview={t(`${ns}.preview`)}
      heading={t(`${ns}.heading`)}
      greeting={spec.audience === 'client' ? t('common.greeting', { name: appointment.clientName }) : undefined}
      paragraphs={[t(`${ns}.intro`)]}
      details={details}
      note={attachments.length > 0 ? t('common.calendarNote') : undefined}
      actionsIntro={actionsIntro}
      actions={actions}
      footer={t('common.footer', { company: company.name, phone: company.contact.phone })}
    />,
  );

  return { subject: payload.subject ?? t(`${ns}.subject`), html, attachments };
}
