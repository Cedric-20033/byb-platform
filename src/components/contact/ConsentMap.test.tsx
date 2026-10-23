// @vitest-environment jsdom
// src/components/contact/ConsentMap.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConsentMap } from './ConsentMap';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));

const SRC_ASSELT = 'https://www.google.com/maps?q=Asselt&output=embed';
const SRC_LIEGE = 'https://www.google.com/maps?q=Liege&output=embed';

const renderMaps = () =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ConsentMap src={SRC_ASSELT} title="Localisation BYB Asselt" siteName="BYB Asselt" />
      <ConsentMap src={SRC_LIEGE} title="Localisation BYB Liège" siteName="BYB Liège" />
    </NextIntlClientProvider>,
  );

describe('ConsentMap', () => {
  it('ne charge aucune carte, donc ne contacte pas Google, tant que le visiteur ne le demande pas', () => {
    const { container } = renderMaps();

    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toContain('google.com');
  });

  it('explique ce que le chargement transmet à Google', () => {
    renderMaps();

    expect(screen.getAllByText(messages.contact.map.consent)).toHaveLength(2);
  });

  it('propose un bouton distinct par carte', () => {
    renderMaps();

    expect(screen.getByRole('button', { name: 'Afficher la carte de BYB Asselt' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Afficher la carte de BYB Liège' })).toBeTruthy();
  });

  it('charge uniquement la carte demandée', () => {
    const { container } = renderMaps();

    fireEvent.click(screen.getByRole('button', { name: 'Afficher la carte de BYB Asselt' }));

    const frames = container.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute('src')).toBe(SRC_ASSELT);
    expect(frames[0].getAttribute('title')).toBe('Localisation BYB Asselt');
    // L'autre carte reste en attente.
    expect(screen.getByRole('button', { name: 'Afficher la carte de BYB Liège' })).toBeTruthy();
  });

  it('remplace le bouton et le message par la carte une fois chargée', () => {
    renderMaps();

    fireEvent.click(screen.getByRole('button', { name: 'Afficher la carte de BYB Asselt' }));

    expect(screen.queryByRole('button', { name: 'Afficher la carte de BYB Asselt' })).toBeNull();
    expect(screen.getAllByText(messages.contact.map.consent)).toHaveLength(1);
  });
});
