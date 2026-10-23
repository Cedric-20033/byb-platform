// src/lib/validation/contact.test.ts
import { describe, expect, it } from 'vitest';
import { contactMessageSchema } from './contact';

const valid = {
  firstName: 'Alice',
  lastName: 'Martin',
  email: 'alice@example.com',
  subject: 'Devis toiture',
  message: 'Bonjour, je souhaite un devis pour ma toiture.',
};

/** Clés de message (voir `messages.ts`) des erreurs d'une saisie, par champ. */
function errorsOf(input: unknown): Record<string, string> {
  const result = contactMessageSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

describe('contactMessageSchema', () => {
  it('accepte une saisie minimale', () => {
    expect(contactMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('retire les espaces autour des champs texte', () => {
    const parsed = contactMessageSchema.parse({ ...valid, firstName: '  Alice ', subject: '  Devis  ', message: `  ${valid.message}  ` });

    expect(parsed).toMatchObject({ firstName: 'Alice', subject: 'Devis', message: valid.message });
  });

  describe('prénom et nom', () => {
    it('refusent une saisie trop courte ou vide', () => {
      expect(errorsOf({ ...valid, firstName: 'A', lastName: '' })).toEqual({
        firstName: 'nameTooShort',
        lastName: 'nameTooShort',
      });
    });

    it('refusent une saisie de plus de 100 caractères', () => {
      expect(errorsOf({ ...valid, lastName: 'x'.repeat(101) })).toEqual({ lastName: 'nameTooLong' });
    });
  });

  describe('email', () => {
    it.each(['', 'alice', 'alice@', '@example.com', 'alice example@x.be'])('refuse %j', (email) => {
      expect(errorsOf({ ...valid, email })).toEqual({ email: 'emailInvalid' });
    });

    it('refuse une adresse de plus de 254 caractères', () => {
      expect(errorsOf({ ...valid, email: `${'a'.repeat(250)}@example.com` })).toEqual({ email: 'emailInvalid' });
    });
  });

  describe('téléphone (facultatif)', () => {
    it.each([undefined, '', '+32 471 54 81 63', '0471 54 81 63', '04.71.54.81.63'])('accepte %j', (phone) => {
      expect(contactMessageSchema.safeParse({ ...valid, phone }).success).toBe(true);
    });

    it.each(['12', 'abcdefgh', '+32 471 54 81 63 (bureau)'])('refuse %j', (phone) => {
      expect(errorsOf({ ...valid, phone })).toEqual({ phone: 'phoneInvalid' });
    });
  });

  describe('objet', () => {
    it('refuse un objet trop court ou trop long', () => {
      expect(errorsOf({ ...valid, subject: 'Hi' })).toEqual({ subject: 'subjectTooShort' });
      expect(errorsOf({ ...valid, subject: 'x'.repeat(151) })).toEqual({ subject: 'subjectTooLong' });
    });

    it.each(['Devis\nBcc: victime@example.com', 'Devis\r\nurgent', 'a\rb c'])(
      'refuse un objet sur plusieurs lignes (injection d\'en-têtes) : %j',
      (subject) => {
        expect(errorsOf({ ...valid, subject })).toEqual({ subject: 'subjectInvalid' });
      },
    );
  });

  describe('message', () => {
    it('refuse un message trop court', () => {
      expect(errorsOf({ ...valid, message: 'Bonjour' })).toEqual({ message: 'messageTooShort' });
    });

    it('refuse un message de plus de 2000 caractères et accepte la borne', () => {
      expect(errorsOf({ ...valid, message: 'x'.repeat(2001) })).toEqual({ message: 'messageTooLong' });
      expect(errorsOf({ ...valid, message: 'x'.repeat(2000) })).toEqual({});
    });

    it('accepte les retours à la ligne', () => {
      expect(errorsOf({ ...valid, message: 'ligne 1\n\nligne 2 est assez longue' })).toEqual({});
    });
  });

  describe('champs techniques', () => {
    it('accepte n\'importe quelle valeur du piège à robots : le refuser préviendrait le robot', () => {
      expect(errorsOf({ ...valid, website: 'https://spam.example' })).toEqual({});
    });

    it('accepte une langue connue et refuse les autres', () => {
      expect(errorsOf({ ...valid, locale: 'de' })).toEqual({});
      expect(errorsOf({ ...valid, locale: 'nl' })).toHaveProperty('locale');
    });

    it('accepte un jeton anti-robot', () => {
      expect(errorsOf({ ...valid, captchaToken: 'abc' })).toEqual({});
    });
  });

  it('chaque message d\'erreur est une clé connue de messages.ts', async () => {
    const { isValidationMessageKey } = await import('./messages');
    const all = errorsOf({
      firstName: '',
      lastName: 'x'.repeat(101),
      email: 'x',
      phone: '1',
      subject: 'a\nb',
      message: '',
    });

    for (const key of Object.values(all)) expect(isValidationMessageKey(key), key).toBe(true);
  });
});
