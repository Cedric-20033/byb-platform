// @vitest-environment jsdom
// src/components/admin/InviteAdminDialog.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InviteAdminDialog } from './InviteAdminDialog';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));

function renderDialog(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <InviteAdminDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />
    </NextIntlClientProvider>,
  );
  return onSubmit;
}

describe('InviteAdminDialog', () => {
  it('refuse un email invalide sans appeler l\'action', async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nom complet'), 'Alice Martin');
    await user.type(screen.getByLabelText('Email'), 'pas-un-email');
    await user.click(screen.getByRole('button', { name: 'Envoyer l\'invitation' }));

    expect(await screen.findByText('Adresse email invalide.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envoie les valeurs saisies, rôle admin par défaut', async () => {
    const onSubmit = renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nom complet'), 'Alice Martin');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.click(screen.getByRole('button', { name: 'Envoyer l\'invitation' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ fullName: 'Alice Martin', email: 'alice@example.com', role: 'admin' }),
    );
  });
});
