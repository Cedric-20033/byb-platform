// @vitest-environment jsdom
// src/components/contact/ContactForm.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from './ContactForm';

const { submitContactMessageAction } = vi.hoisted(() => ({ submitContactMessageAction: vi.fn() }));
vi.mock('@/app/actions/contact/submitContactMessage', () => ({ submitContactMessageAction }));
// Hors du routeur de Next, `next/link` n'a rien à apporter : un simple lien suffit au test.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
const copy = messages.contact.form;

const renderForm = (locale = 'fr') =>
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ContactForm />
    </NextIntlClientProvider>,
  );

/** Les libellés contiennent parfois des caractères propres aux expressions régulières (parenthèses, « ? »). */
const startsWith = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

const field = (label: string) => screen.getByLabelText(startsWith(label));
const submitButton = () => screen.getByRole('button', { name: startsWith(copy.submit) });

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field(copy.firstName), 'Alice');
  await user.type(field(copy.lastName), 'Martin');
  await user.type(field(copy.email), 'alice@example.com');
  await user.type(field(copy.subject), 'Devis toiture');
  await user.type(field(copy.message), 'Bonjour, je souhaite un devis pour ma toiture.');
}

beforeEach(() => submitContactMessageAction.mockReset());

describe('ContactForm', () => {
  it('envoie les valeurs saisies avec la langue du site et affiche la confirmation', async () => {
    submitContactMessageAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderForm('fr');

    await fillValidForm(user);
    await user.click(submitButton());

    await waitFor(() => expect(submitContactMessageAction).toHaveBeenCalledTimes(1));
    expect(submitContactMessageAction.mock.calls[0][0]).toMatchObject({
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      subject: 'Devis toiture',
      message: 'Bonjour, je souhaite un devis pour ma toiture.',
      locale: 'fr',
    });
    expect(await screen.findByText(copy.successTitle)).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('transmet la langue courante, pour l\'accusé de réception', async () => {
    submitContactMessageAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderForm('de');

    await fillValidForm(user);
    await user.click(submitButton());

    await waitFor(() => expect(submitContactMessageAction).toHaveBeenCalled());
    expect(submitContactMessageAction.mock.calls[0][0].locale).toBe('de');
  });

  it('refuse un formulaire vide avec des messages traduits, sans appeler le serveur', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(submitButton());

    expect(await screen.findAllByText(messages.errors.validation.nameTooShort)).toHaveLength(2);
    expect(screen.getByText(messages.errors.validation.emailInvalid)).toBeTruthy();
    expect(screen.getByText(messages.errors.validation.subjectTooShort)).toBeTruthy();
    expect(screen.getByText(messages.errors.validation.messageTooShort)).toBeTruthy();
    expect(submitContactMessageAction).not.toHaveBeenCalled();
  });

  it('relie chaque erreur à son champ pour les lecteurs d\'écran', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(submitButton());
    await screen.findAllByRole('alert');

    const email = field(copy.email);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(email.getAttribute('aria-describedby')!)?.textContent).toBe(
      messages.errors.validation.emailInvalid,
    );
  });

  it('affiche l\'erreur du serveur et garde la saisie pour une nouvelle tentative', async () => {
    submitContactMessageAction.mockResolvedValue({ success: false, error: 'EMAIL_DELIVERY_FAILED' });
    const user = userEvent.setup();
    renderForm();

    await fillValidForm(user);
    await user.click(submitButton());

    expect(await screen.findByText(messages.errors.codes.EMAIL_DELIVERY_FAILED)).toBeTruthy();
    expect((field(copy.firstName) as HTMLInputElement).value).toBe('Alice');
    expect(screen.queryByText(copy.successTitle)).toBeNull();
  });

  it('rappelle l\'usage des données saisies, avec un lien vers la politique de confidentialité', () => {
    renderForm('fr');

    expect(screen.getByText(/servent uniquement à répondre à votre demande/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Politique de confidentialité' }).getAttribute('href')).toBe(
      '/fr/politique-confidentialite',
    );
  });

  it('contient un piège à robots invisible et hors de l\'ordre de tabulation', () => {
    const { container } = renderForm();

    const trap = container.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.autocomplete).toBe('off');
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('signale les champs obligatoires et laisse le téléphone facultatif', () => {
    renderForm();

    for (const label of [copy.firstName, copy.lastName, copy.email, copy.subject, copy.message]) {
      expect(field(label).getAttribute('aria-required')).toBe('true');
    }
    expect(field(copy.phone).getAttribute('aria-required')).toBeNull();
  });
});
