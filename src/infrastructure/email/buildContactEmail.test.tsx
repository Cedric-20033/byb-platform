// src/infrastructure/email/buildContactEmail.test.tsx
import { describe, expect, it } from 'vitest';
import type { AppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import type { ContactMessage } from '@/domain/contact/ContactMessage';
import { EmailType, type EmailPayload } from '@/domain/shared/EmailProvider';
import { buildContactEmail, isContactEmail } from './buildContactEmail';

const message: ContactMessage = {
  firstName: 'Alice',
  lastName: 'Martin',
  email: 'alice@example.com',
  phone: '+32 470 12 34 56',
  subject: 'Devis toiture',
  message: 'Bonjour,\nJe souhaite un devis.',
};

const payload = (type: EmailType, locale?: AppointmentLocale, data: Partial<ContactMessage> = {}): EmailPayload => ({
  to: 'destinataire@example.com',
  type,
  locale,
  data: { message: { ...message, ...data } },
});

describe('buildContactEmail : message transmis à l\'équipe', () => {
  const team = (locale?: AppointmentLocale, data?: Partial<ContactMessage>) =>
    buildContactEmail(payload(EmailType.ADMIN_CONTACT_MESSAGE, locale, data));

  it('reprend l\'objet du visiteur dans l\'objet de l\'email', async () => {
    expect((await team())!.subject).toBe('Nouveau message de contact : Devis toiture');
  });

  it('détaille l\'expéditeur et son message', async () => {
    const { html } = (await team())!;

    for (const value of ['Alice Martin', 'alice@example.com', '+32 470 12 34 56', 'Devis toiture', 'Je souhaite un devis.']) {
      expect(html).toContain(value);
    }
  });

  it('omet le téléphone quand il n\'est pas fourni', async () => {
    const { html } = (await team('fr', { phone: null }))!;

    expect(html).not.toContain('Téléphone');
  });

  it('conserve les retours à la ligne du message', async () => {
    expect((await team())!.html).toContain('white-space:pre-wrap');
  });

  it('écrit toujours en français, quelle que soit la langue demandée', async () => {
    const email = (await team('de'))!;

    expect(email.html).toContain('lang="fr"');
    expect(email.subject).toMatch(/^Nouveau message de contact/);
  });

  it('échappe ce qu\'a saisi le visiteur', async () => {
    const { html } = (await team('fr', { message: '<script>alert(1)</script>', firstName: '<b>Alice</b>' }))!;

    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toContain('<b>Alice</b>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('n\'a ni pièce jointe ni lien d\'accès à un rendez-vous', async () => {
    const email = (await team())!;

    expect(email.attachments).toEqual([]);
    expect(email.html).not.toContain('/rdv/');
  });
});

describe('buildContactEmail : accusé de réception', () => {
  const ack = (locale?: AppointmentLocale) => buildContactEmail(payload(EmailType.CONTACT_ACKNOWLEDGEMENT, locale));

  it.each([
    ['fr', 'Nous avons bien reçu votre message', 'Bonjour Alice,'],
    ['en', 'We have received your message', 'Hello Alice,'],
    ['de', 'Wir haben Ihre Nachricht erhalten', 'Guten Tag Alice,'],
  ] as const)('répond au visiteur en %s', async (locale, subject, greeting) => {
    const email = (await ack(locale))!;

    expect(email.subject).toBe(subject);
    expect(email.html).toContain(`lang="${locale}"`);
    expect(email.html).toContain(greeting);
  });

  it('joint une copie de ce que le visiteur a écrit', async () => {
    const { html } = (await ack('fr'))!;

    expect(html).toContain('Devis toiture');
    expect(html).toContain('Je souhaite un devis.');
  });

  it('ne contient aucun détail de l\'expéditeur autre que son message', async () => {
    expect((await ack('fr'))!.html).not.toContain('+32 470 12 34 56');
  });

  it('écrit en français par défaut', async () => {
    expect((await ack())!.subject).toBe('Nous avons bien reçu votre message');
  });

  it.each(['fr', 'en', 'de'] as const)('(%s) ne laisse aucune clé de traduction manquante', async (locale) => {
    for (const type of [EmailType.ADMIN_CONTACT_MESSAGE, EmailType.CONTACT_ACKNOWLEDGEMENT]) {
      const email = (await buildContactEmail(payload(type, locale)))!;

      expect(email.html).not.toMatch(/emails\.[a-zA-Z]/);
      expect(email.subject).not.toMatch(/emails\.[a-zA-Z]/);
    }
  });
});

describe('isContactEmail', () => {
  it('reconnaît les deux emails de contact et rien d\'autre', async () => {
    expect(isContactEmail(EmailType.ADMIN_CONTACT_MESSAGE)).toBe(true);
    expect(isContactEmail(EmailType.CONTACT_ACKNOWLEDGEMENT)).toBe(true);
    expect(isContactEmail(EmailType.APPOINTMENT_CONFIRMATION)).toBe(false);
    expect(await buildContactEmail(payload(EmailType.ADMIN_NEW_APPOINTMENT))).toBeNull();
  });
});
