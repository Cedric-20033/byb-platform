// @vitest-environment jsdom
// src/components/admin/AppointmentsPagination.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentsPagination } from './AppointmentsPagination';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
const t = messages.admin.appointments.pagination;

function renderPagination(props: { page: number; pageSize?: number; total: number }) {
  const onPageChange = vi.fn();
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AppointmentsPagination pageSize={20} onPageChange={onPageChange} {...props} />
    </NextIntlClientProvider>,
  );
  return onPageChange;
}

const previous = () => screen.getByRole('button', { name: new RegExp(t.previous) }) as HTMLButtonElement;
const next = () => screen.getByRole('button', { name: new RegExp(t.next) }) as HTMLButtonElement;

describe('AppointmentsPagination', () => {
  it('n\'affiche rien quand il n\'y a aucun résultat', () => {
    renderPagination({ page: 1, total: 0 });

    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('indique la plage affichée, le total et la page courante', () => {
    renderPagination({ page: 2, total: 45 });

    expect(screen.getByText('21 à 40 sur 45')).toBeTruthy();
    expect(screen.getByText('Page 2 sur 3')).toBeTruthy();
  });

  it('borne la dernière plage au total', () => {
    renderPagination({ page: 3, total: 45 });

    expect(screen.getByText('41 à 45 sur 45')).toBeTruthy();
  });

  it('désactive Précédent sur la première page et Suivant sur la dernière', () => {
    renderPagination({ page: 1, total: 45 });
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
  });

  it('désactive Suivant sur la dernière page', () => {
    renderPagination({ page: 3, total: 45 });

    expect(next().disabled).toBe(true);
    expect(previous().disabled).toBe(false);
  });

  it('demande la page voisine au clic', async () => {
    const onPageChange = renderPagination({ page: 2, total: 45 });
    const user = userEvent.setup();

    await user.click(previous());
    await user.click(next());

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });
});
