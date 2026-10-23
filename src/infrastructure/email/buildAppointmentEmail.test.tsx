// src/infrastructure/email/buildAppointmentEmail.test.tsx
import { describe, expect, it } from 'vitest';
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import type { AppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import { EmailType, type EmailPayload } from '@/domain/shared/EmailProvider';
import type { AppointmentEmailContext } from './AppointmentEmailContext';
import { buildAppointmentEmail, isAppointmentEmail, resolveEmailLocale } from './buildAppointmentEmail';

const BASE_URL = 'https://byb.test';
const TOKEN = '3f2b8c1e-5a4d-4e7b-9c3a-1d2e3f4a5b6c';
const NOW = new Date('2026-10-15T08:00:00Z');

const context: AppointmentEmailContext = {
  accessToken: TOKEN,
  slot: { date: '2026-10-20', startTime: '09:00:00', endTime: '10:00:00' },
  serviceName: 'Toiture',
  subServiceName: 'Toiture plate',
};

const appointment = (locale: AppointmentLocale, name = 'Alice Martin') =>
  new Appointment(
    'apt-1',
    'slot-1',
    'svc-1',
    null,
    'alice@example.com',
    name,
    '+32 470 12 34 56',
    'Prévoir une échelle',
    AppointmentStatus.CONFIRMED,
    new Date('2026-10-01T10:00:00Z'),
    locale,
  );

const payload = (type: EmailType, locale: AppointmentLocale, data: Record<string, unknown> = {}): EmailPayload => ({
  to: 'alice@example.com',
  type,
  data: { appointment: appointment(locale), ...data },
});

const build = (p: EmailPayload, ctx: AppointmentEmailContext | null = context) =>
  buildAppointmentEmail(p, ctx, { baseUrl: BASE_URL, now: NOW });

const LOCALES: AppointmentLocale[] = ['fr', 'en', 'de'];
const CLIENT_TYPES = [
  EmailType.APPOINTMENT_CONFIRMATION,
  EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN,
  EmailType.APPOINTMENT_CANCELLATION,
  EmailType.APPOINTMENT_RESCHEDULED,
  EmailType.APPOINTMENT_REMINDER,
];
const ADMIN_TYPES = [
  EmailType.ADMIN_NEW_APPOINTMENT,
  EmailType.ADMIN_APPOINTMENT_CANCELLED_BY_CLIENT,
  EmailType.ADMIN_APPOINTMENT_RESCHEDULED_BY_CLIENT,
];

const slotChange = {
  previousSlot: { date: '2026-10-20', startTime: '09:00:00', endTime: '10:00:00' },
  newSlot: { date: '2026-10-22', startTime: '14:00:00', endTime: '15:00:00' },
};

describe('buildAppointmentEmail : tous les gabarits, toutes les langues', () => {
  for (const type of [...CLIENT_TYPES, ...ADMIN_TYPES]) {
    for (const locale of LOCALES) {
      it(`${type} (${locale}) : objet, HTML complet, aucune clé de traduction manquante`, async () => {
        const email = await build(payload(type, locale, slotChange));

        expect(email).not.toBeNull();
        expect(email!.subject.trim()).not.toBe('');
        expect(email!.html).toContain('Toiture');
        // Une clé absente est rendue telle quelle (« emails.xxx ») : elle ne doit jamais atteindre un destinataire.
        expect(email!.html).not.toMatch(/emails\.[a-zA-Z]/);
        expect(email!.subject).not.toMatch(/emails\.[a-zA-Z]/);
      });
    }
  }
});

describe('buildAppointmentEmail : langue', () => {
  it.each([
    ['fr', 'Votre rendez-vous est confirmé', 'mardi 20 octobre 2026'],
    ['en', 'Your appointment is confirmed', 'Tuesday, October 20, 2026'],
    ['de', 'Ihr Termin ist bestätigt', 'Dienstag, 20. Oktober 2026'],
  ] as const)('écrit au client en %s', async (locale, subject, date) => {
    const email = await build(payload(EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN, locale));

    expect(email!.subject).toBe(subject);
    expect(email!.html).toContain(`lang="${locale}"`);
    expect(email!.html).toContain(date);
    expect(email!.html).toContain('09:00');
  });

  it('écrit toujours à l\'équipe en français', async () => {
    const email = await build(payload(EmailType.ADMIN_NEW_APPOINTMENT, 'en'));

    expect(email!.subject).toBe('Nouveau rendez-vous à confirmer');
    expect(email!.html).toContain('lang="fr"');
  });

  it('préfère la langue du payload à celle du rendez-vous', () => {
    expect(resolveEmailLocale({ ...payload(EmailType.APPOINTMENT_CONFIRMATION, 'de'), locale: 'en' })).toBe('en');
    expect(resolveEmailLocale(payload(EmailType.APPOINTMENT_CONFIRMATION, 'de'))).toBe('de');
  });
});

describe('buildAppointmentEmail : liens', () => {
  it.each([
    EmailType.APPOINTMENT_CONFIRMATION,
    EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN,
    EmailType.APPOINTMENT_RESCHEDULED,
    EmailType.APPOINTMENT_REMINDER,
  ])('%s propose de modifier et d\'annuler, dans la langue du client', async (type) => {
    const email = await build(payload(type, 'en', slotChange));

    expect(email!.html).toContain(`${BASE_URL}/en/rdv/annuler/${TOKEN}`);
    expect(email!.html).toContain(`${BASE_URL}/en/rdv/modifier/${TOKEN}`);
  });

  it('une annulation propose de reprendre rendez-vous, sans lien d\'accès', async () => {
    const email = await build(payload(EmailType.APPOINTMENT_CANCELLATION, 'de'));

    expect(email!.html).toContain(`${BASE_URL}/de/rdv"`);
    expect(email!.html).not.toContain(TOKEN);
  });

  it('un email à l\'équipe ne contient jamais le jeton du client', async () => {
    for (const type of ADMIN_TYPES) {
      expect((await build(payload(type, 'fr', slotChange)))!.html).not.toContain(TOKEN);
    }
  });

  it('un email à l\'équipe ouvre le rendez-vous dans le dashboard', async () => {
    const email = await build(payload(EmailType.ADMIN_NEW_APPOINTMENT, 'fr'));

    expect(email!.html).toContain(`${BASE_URL}/fr/dashboard/appointments?status=pending&amp;open=apt-1`);
  });
});

describe('buildAppointmentEmail : contenu', () => {
  it('joint un fichier calendrier aux confirmations et aux déplacements seulement', async () => {
    for (const type of CLIENT_TYPES) {
      const email = await build(payload(type, 'fr', slotChange));
      const expected = type === EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN || type === EmailType.APPOINTMENT_RESCHEDULED;

      expect(email!.attachments).toHaveLength(expected ? 1 : 0);
    }
  });

  it('le fichier calendrier décrit le créneau actuel en heure de Bruxelles', async () => {
    const [ics] = (await build(payload(EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN, 'fr')))!.attachments;

    expect(ics.filename).toBe('rendez-vous.ics');
    expect(ics.contentType).toContain('text/calendar');
    expect(ics.content).toContain('DTSTART;TZID=Europe/Brussels:20261020T090000');
    expect(ics.content).toContain('DTEND;TZID=Europe/Brussels:20261020T100000');
    expect(ics.content).toContain('UID:apt-1@byb-construction');
  });

  it('un déplacement montre l\'ancien et le nouveau créneau', async () => {
    const email = await build(payload(EmailType.APPOINTMENT_RESCHEDULED, 'fr', slotChange));

    expect(email!.html).toContain('mardi 20 octobre 2026');
    expect(email!.html).toContain('jeudi 22 octobre 2026');
    expect(email!.html).toContain('14:00 à 15:00');
  });

  it('une annulation affiche le motif transmis', async () => {
    const email = await build(payload(EmailType.APPOINTMENT_CANCELLATION, 'fr', { reason: 'Chantier urgent' }));

    expect(email!.html).toContain('Message de notre équipe');
    expect(email!.html).toContain('Chantier urgent');
  });

  it('un email à l\'équipe détaille le client', async () => {
    const email = await build(payload(EmailType.ADMIN_NEW_APPOINTMENT, 'fr'));

    for (const value of ['Alice Martin', 'alice@example.com', '+32 470 12 34 56', 'Prévoir une échelle']) {
      expect(email!.html).toContain(value);
    }
  });

  it('échappe le texte saisi par le client', async () => {
    const hostile = appointment('fr', '<script>alert(1)</script>');
    const email = await build({ to: 'x@y.be', type: EmailType.APPOINTMENT_CONFIRMATION, data: { appointment: hostile } });

    expect(email!.html).not.toContain('<script>alert(1)');
    expect(email!.html).toContain('&lt;script&gt;');
  });

  it('respecte un objet imposé par l\'appelant', async () => {
    const email = await build({ ...payload(EmailType.APPOINTMENT_CONFIRMATION, 'fr'), subject: 'Objet imposé' });

    expect(email!.subject).toBe('Objet imposé');
  });
});

describe('buildAppointmentEmail : contexte indisponible', () => {
  it('envoie quand même, sans service, sans liens et sans fichier calendrier', async () => {
    const email = await build(payload(EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN, 'fr'), null);

    expect(email!.subject).toBe('Votre rendez-vous est confirmé');
    expect(email!.html).not.toContain('/rdv/annuler/');
    expect(email!.attachments).toEqual([]);
  });

  it('utilise le créneau fourni par le use case à défaut de la base (nouvelle demande)', async () => {
    const email = await build(
      payload(EmailType.ADMIN_NEW_APPOINTMENT, 'fr', { slotDate: '2026-10-20', slotStartTime: '09:00:00' }),
      null,
    );

    expect(email!.html).toContain('mardi 20 octobre 2026');
    expect(email!.html).toContain('09:00');
  });
});

describe('isAppointmentEmail', () => {
  it('reconnaît les emails de rendez-vous et laisse l\'invitation à son rendu propre', async () => {
    expect(isAppointmentEmail(EmailType.APPOINTMENT_CONFIRMATION)).toBe(true);
    expect(isAppointmentEmail(EmailType.ADMIN_APPOINTMENT_CANCELLED_BY_CLIENT)).toBe(true);
    expect(isAppointmentEmail(EmailType.ADMIN_INVITATION)).toBe(false);
    expect(await build({ to: 'a@b.be', type: EmailType.ADMIN_INVITATION, data: {} })).toBeNull();
  });
});
