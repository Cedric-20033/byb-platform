// src/infrastructure/email/ResendEmailProvider.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import { EmailType, type EmailPayload } from '@/domain/shared/EmailProvider';
import type { AppointmentEmailContextResolver } from './AppointmentEmailContext';
import { ResendEmailProvider } from './ResendEmailProvider';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const RECIPIENT = 'destinataire@example.com';

const contact: EmailPayload = {
  to: RECIPIENT,
  type: EmailType.ADMIN_CONTACT_MESSAGE,
  locale: 'fr',
  replyTo: 'alice@example.com',
  data: {
    message: {
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      phone: null,
      subject: 'Devis toiture',
      message: 'Bonjour, je souhaite un devis.',
    },
  },
};

const appointment = new Appointment(
  'apt-1',
  'slot-1',
  'svc-1',
  null,
  'alice@example.com',
  'Alice Martin',
  '+32 470 12 34 56',
  null,
  AppointmentStatus.CONFIRMED,
  new Date('2026-10-01T10:00:00Z'),
  'en',
);

const resolver: AppointmentEmailContextResolver = {
  resolve: vi.fn().mockResolvedValue({
    accessToken: '3f2b8c1e-5a4d-4e7b-9c3a-1d2e3f4a5b6c',
    slot: { date: '2026-10-20', startTime: '09:00:00', endTime: '10:00:00' },
    serviceName: 'Roofing',
    subServiceName: null,
  }),
};

const provider = (contextResolver = resolver) => new ResendEmailProvider('cle', 'site@byb.test', contextResolver);

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sendMock.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null });
  vi.mocked(resolver.resolve).mockClear();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
// Restaure uniquement l'espion : `restoreAllMocks` réinitialiserait aussi l'implémentation du résolveur partagé.
afterEach(() => errorSpy.mockRestore());

describe('ResendEmailProvider.sendOrThrow', () => {
  it('envoie depuis l\'expéditeur du site, avec une adresse de réponse', async () => {
    await provider().sendOrThrow(contact);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      from: 'site@byb.test',
      to: RECIPIENT,
      replyTo: 'alice@example.com',
      subject: 'Nouveau message de contact : Devis toiture',
    });
    expect(sendMock.mock.calls[0][0].html).toContain('je souhaite un devis');
  });

  it('lève EMAIL_DELIVERY_FAILED quand le fournisseur refuse', async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: 'validation_error', message: 'domaine non vérifié' } });

    await expect(provider().sendOrThrow(contact)).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_FAILED' });
  });

  it('lève EMAIL_DELIVERY_FAILED quand le fournisseur est injoignable', async () => {
    sendMock.mockRejectedValue(new Error('réseau'));

    await expect(provider().sendOrThrow(contact)).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_FAILED' });
  });

  it('journalise l\'échec sans le destinataire, donnée personnelle', async () => {
    sendMock.mockResolvedValue({ data: null, error: { name: 'x', message: 'refusé' } });

    await expect(provider().sendOrThrow(contact)).rejects.toThrow();

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain(EmailType.ADMIN_CONTACT_MESSAGE);
    expect(logged).not.toContain(RECIPIENT);
  });
});

describe('ResendEmailProvider.send (au mieux)', () => {
  it('n\'échoue jamais vers l\'appelant, ni sur refus ni sur panne', async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { name: 'x', message: 'refusé' } });
    await expect(provider().send(contact)).resolves.toBeUndefined();

    sendMock.mockRejectedValueOnce(new Error('réseau'));
    await expect(provider().send(contact)).resolves.toBeUndefined();
  });

  it('envoie quand tout va bien', async () => {
    await provider().send(contact);

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe('ResendEmailProvider : emails de rendez-vous', () => {
  const confirmed: EmailPayload = {
    to: 'alice@example.com',
    type: EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN,
    data: { appointment },
  };

  it('relit le contexte du rendez-vous dans la langue du client et joint le fichier calendrier', async () => {
    await provider().send(confirmed);

    expect(resolver.resolve).toHaveBeenCalledWith('apt-1', 'en');
    const sent = sendMock.mock.calls[0][0];
    expect(sent.subject).toBe('Your appointment is confirmed');
    expect(sent.html).toContain('Roofing');
    expect(sent.attachments).toHaveLength(1);
    expect(Buffer.isBuffer(sent.attachments[0].content)).toBe(true);
    expect(sent.attachments[0].content.toString()).toContain('BEGIN:VCALENDAR');
  });

  it('envoie quand même, sans détails, si le contexte est illisible', async () => {
    const broken: AppointmentEmailContextResolver = { resolve: vi.fn().mockRejectedValue(new Error('base injoignable')) };

    await provider(broken).sendOrThrow(confirmed);

    const sent = sendMock.mock.calls[0][0];
    expect(sent.subject).toBe('Your appointment is confirmed');
    expect(sent.html).not.toContain('/rdv/annuler/');
    expect(sent.attachments).toEqual([]);
  });
});

describe('ResendEmailProvider : invitation d\'un admin', () => {
  it('garde son rendu et l\'objet fourni par l\'appelant', async () => {
    await provider().sendOrThrow({
      to: RECIPIENT,
      type: EmailType.ADMIN_INVITATION,
      subject: 'Invitation BYB',
      locale: 'fr',
      data: { url: 'https://byb.test/auth/callback?x=1&y=2', fullName: 'Bob <script>' },
    });

    const sent = sendMock.mock.calls[0][0];
    expect(sent.subject).toBe('Invitation BYB');
    expect(sent.html).toContain('https://byb.test/auth/callback?x=1&amp;y=2');
    expect(sent.html).toContain('Bob &lt;script&gt;');
    expect(resolver.resolve).not.toHaveBeenCalled();
  });
});
