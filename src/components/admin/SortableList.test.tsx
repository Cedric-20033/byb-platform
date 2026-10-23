// @vitest-environment jsdom
// src/components/admin/SortableList.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { SortableList, moveItem } from './SortableList';

const messages = { admin: { catalog: { moveUp: 'Monter', moveDown: 'Descendre' } } };

describe('moveItem', () => {
  it('déplace un élément sans muter la liste d\'origine', () => {
    const original = ['a', 'b', 'c'];

    expect(moveItem(original, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(original).toEqual(['a', 'b', 'c']);
  });

  it('ignore les positions hors limites', () => {
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('SortableList', () => {
  function setup(disabled = false) {
    const onReorder = vi.fn();
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <SortableList
          items={['a', 'b', 'c']}
          getId={(item) => item}
          onReorder={onReorder}
          disabled={disabled}
          renderItem={(item) => <span>{item}</span>}
        />
      </NextIntlClientProvider>,
    );
    return onReorder;
  }

  it('les flèches réordonnent (alternative clavier au glisser-déposer)', async () => {
    const onReorder = setup();

    await userEvent.click(screen.getAllByRole('button', { name: 'Descendre' })[0]);

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('désactive la flèche vers le haut du premier élément et vers le bas du dernier', () => {
    setup();

    expect(screen.getAllByRole('button', { name: 'Monter' })[0]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Descendre' })[2]).toBeDisabled();
  });

  it('n\'affiche aucune commande de tri quand la liste est désactivée', () => {
    setup(true);

    expect(screen.queryByRole('button', { name: 'Monter' })).toBeNull();
  });
});
