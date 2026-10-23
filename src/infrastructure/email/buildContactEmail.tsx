// src/infrastructure/email/buildContactEmail.tsx
import { render } from '@react-email/components';
import { toAppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import type { ContactMessage } from '@/domain/contact/ContactMessage';
import { EmailType, type EmailPayload } from '@/domain/shared/EmailProvider';
import { company } from '@/data/company';
import type { BuiltEmail } from './buildAppointmentEmail';
import { createEmailTranslator } from './emailTranslator';
import { TransactionalEmail, type EmailDetailRow } from './TransactionalEmail';

/** Espace de noms `emails.*` de chaque type, et à qui il s'adresse. */
const SPECS: Partial<Record<EmailType, { namespace: string; audience: 'team' | 'visitor' }>> = {
  [EmailType.ADMIN_CONTACT_MESSAGE]: { namespace: 'adminContactMessage', audience: 'team' },
  [EmailType.CONTACT_ACKNOWLEDGEMENT]: { namespace: 'contactAcknowledgement', audience: 'visitor' },
};

export function isContactEmail(type: EmailType): boolean {
  return type in SPECS;
}

/**
 * Compose les deux emails du formulaire de contact : le message transmis à l'équipe (toujours en français) et
 * l'accusé de réception du visiteur (dans sa langue, avec une copie de ce qu'il a écrit).
 * Retourne `null` pour un type qui n'est pas un email de contact.
 */
export async function buildContactEmail(payload: EmailPayload): Promise<BuiltEmail | null> {
  const spec = SPECS[payload.type];
  if (!spec) return null;

  const locale = spec.audience === 'team' ? 'fr' : toAppointmentLocale(payload.locale);
  const t = createEmailTranslator(locale);
  const ns = spec.namespace;
  const contact = payload.data.message as ContactMessage;

  const details: EmailDetailRow[] =
    spec.audience === 'team'
      ? [
          { label: t('common.fields.sender'), value: `${contact.firstName} ${contact.lastName}` },
          { label: t('common.fields.email'), value: contact.email },
          ...(contact.phone ? [{ label: t('common.fields.phone'), value: contact.phone }] : []),
          { label: t('common.fields.subject'), value: contact.subject },
          { label: t('common.fields.message'), value: contact.message },
        ]
      : [
          { label: t('common.fields.subject'), value: contact.subject },
          { label: t('common.fields.message'), value: contact.message },
        ];

  const html = await render(
    <TransactionalEmail
      lang={locale}
      preview={t(`${ns}.preview`)}
      heading={t(`${ns}.heading`)}
      greeting={spec.audience === 'visitor' ? t('common.greeting', { name: contact.firstName }) : undefined}
      paragraphs={[t(`${ns}.intro`)]}
      details={details}
      footer={t('common.footer', { company: company.name, phone: company.contact.phone })}
    />,
  );

  return { subject: payload.subject ?? t(`${ns}.subject`, { subject: contact.subject }), html, attachments: [] };
}
