// src/application/contact/SubmitContactMessage.test.ts
import { describe, expect, it } from 'vitest';
import { EmailType } from '@/domain/shared/EmailProvider';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { SubmitContactMessage, type SubmitContactMessageInput } from './SubmitContactMessage';

const TEAM = 'equipe@byb.test';

const input: SubmitContactMessageInput = {
  firstName: 'Alice',
  lastName: 'Martin',
  email: 'alice@example.com',
  phone: '+32 470 12 34 56',
  subject: 'Devis toiture',
  message: 'Bonjour,\nJe souhaite un devis pour ma toiture.',
};

function setup() {
  const emails = new FakeEmailProvider();
  return { emails, useCase: new SubmitContactMessage(emails, emails, TEAM) };
}

describe('SubmitContactMessage', () => {
  it('transmet le message à l\'équipe, qui peut répondre au visiteur d\'un clic', async () => {
    const { useCase, emails } = setup();

    await useCase.execute(input);

    expect(emails.sent[0]).toMatchObject({
      to: TEAM,
      type: EmailType.ADMIN_CONTACT_MESSAGE,
      locale: 'fr',
      replyTo: 'alice@example.com',
    });
    expect(emails.sent[0].data.message).toEqual({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      phone: '+32 470 12 34 56',
      subject: 'Devis toiture',
      message: 'Bonjour,\nJe souhaite un devis pour ma toiture.',
    });
  });

  it('envoie ensuite un accusé de réception au visiteur, dans sa langue', async () => {
    const { useCase, emails } = setup();

    await useCase.execute({ ...input, locale: 'de' });

    expect(emails.sent).toHaveLength(2);
    expect(emails.sent[1]).toMatchObject({ to: 'alice@example.com', type: EmailType.CONTACT_ACKNOWLEDGEMENT, locale: 'de' });
  });

  it('écrit en français par défaut', async () => {
    const { useCase, emails } = setup();

    await useCase.execute(input);

    expect(emails.sent[1].locale).toBe('fr');
  });

  it('refuse d\'annoncer un succès quand le message n\'a pas pu partir', async () => {
    const { useCase, emails } = setup();
    emails.failDelivery = true;

    await expect(useCase.execute(input)).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_FAILED' });
  });

  it('n\'envoie pas d\'accusé de réception pour un message qui n\'est pas parti', async () => {
    const { useCase, emails } = setup();
    emails.failDelivery = true;

    await expect(useCase.execute(input)).rejects.toThrow();

    expect(emails.sent).toEqual([]);
  });

  describe('normalisation', () => {
    it('enregistre l\'email en minuscules, sans espaces autour', async () => {
      const { useCase, emails } = setup();

      await useCase.execute({ ...input, email: '  Alice@Example.COM ' });

      expect(emails.sent[0].replyTo).toBe('alice@example.com');
      expect(emails.sent[1].to).toBe('alice@example.com');
    });

    it('replie l\'objet sur une ligne : aucune injection d\'en-têtes d\'email', async () => {
      const { useCase, emails } = setup();

      await useCase.execute({ ...input, subject: 'Devis\r\nBcc: victime@example.com\n  urgent' });

      expect((emails.sent[0].data.message as { subject: string }).subject).toBe('Devis Bcc: victime@example.com urgent');
    });

    it('replie les espaces multiples des noms', async () => {
      const { useCase, emails } = setup();

      await useCase.execute({ ...input, firstName: '  Anne   Marie ', lastName: ' Du  Pont' });

      expect(emails.sent[0].data.message).toMatchObject({ firstName: 'Anne Marie', lastName: 'Du Pont' });
    });

    it('garde les retours à la ligne du message', async () => {
      const { useCase, emails } = setup();

      await useCase.execute({ ...input, message: '  ligne 1\n\nligne 3  ' });

      expect((emails.sent[0].data.message as { message: string }).message).toBe('ligne 1\n\nligne 3');
    });

    it.each([undefined, '', '   '])('traite le téléphone %j comme absent', async (phone) => {
      const { useCase, emails } = setup();

      await useCase.execute({ ...input, phone });

      expect((emails.sent[0].data.message as { phone: string | null }).phone).toBeNull();
    });
  });
});
