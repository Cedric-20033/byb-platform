// @vitest-environment jsdom
// src/components/layout/Floatingcta.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingCTA } from './Floatingcta';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/fr' } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));
// Le wizard a ses propres tests : ici, seul compte le fait que le bouton l'ouvre.
vi.mock('@/components/booking/BookingDialog', () => ({
  BookingDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">wizard</div> : null),
}));

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));

/** Réglage du « document » simulé : jsdom ne fait aucune mise en page, on fournit les mesures. */
function setPage({ scrollHeight, scrollY = 0 }: { scrollHeight: number; scrollY?: number }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: scrollY });
}

let notifyResize: () => void;
beforeEach(() => {
  pathname.current = '/fr';
  // jsdom n'a pas de ResizeObserver ; comme le vrai, celui-ci mesure une première fois à l'observation.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe() {
        notifyResize();
      }
      disconnect() {}
      unobserve() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

const renderCta = () =>
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <FloatingCTA services={[]} />
    </NextIntlClientProvider>,
  );

const wrapperOf = () => screen.getByTestId('floating-cta').parentElement as HTMLElement;

describe('FloatingCTA', () => {
  it('reste caché, et inatteignable, en haut d\'une page longue', () => {
    setPage({ scrollHeight: 4000 });
    renderCta();

    expect(wrapperOf().hasAttribute('inert')).toBe(true);
  });

  it('apparaît quand on défile au-delà du seuil', () => {
    setPage({ scrollHeight: 4000 });
    renderCta();

    act(() => {
      window.scrollY = 500;
      fireEvent.scroll(window);
    });

    expect(wrapperOf().hasAttribute('inert')).toBe(false);
  });

  it('se cache de nouveau quand on remonte en haut', () => {
    setPage({ scrollHeight: 4000, scrollY: 500 });
    renderCta();
    act(() => fireEvent.scroll(window));
    expect(wrapperOf().hasAttribute('inert')).toBe(false);

    act(() => {
      window.scrollY = 0;
      fireEvent.scroll(window);
    });

    expect(wrapperOf().hasAttribute('inert')).toBe(true);
  });

  it('est disponible d\'emblée sur une page qui ne défile pas (404)', () => {
    setPage({ scrollHeight: 800 });
    renderCta();

    expect(wrapperOf().hasAttribute('inert')).toBe(false);
  });

  it('se re-mesure quand le contenu change de hauteur', () => {
    setPage({ scrollHeight: 800 });
    renderCta();
    expect(wrapperOf().hasAttribute('inert')).toBe(false);

    act(() => {
      setPage({ scrollHeight: 4000 });
      notifyResize();
    });

    expect(wrapperOf().hasAttribute('inert')).toBe(true);
  });

  it('porte le libellé traduit, atteignable par son nom', () => {
    setPage({ scrollHeight: 800 });
    renderCta();

    expect(screen.getByRole('button', { name: 'Prendre un RDV' })).toBe(screen.getByTestId('floating-cta'));
  });

  it('ouvre le wizard de réservation au clic', () => {
    setPage({ scrollHeight: 800 });
    renderCta();

    fireEvent.click(screen.getByTestId('floating-cta'));

    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('n\'est pas rendu sur la page de réservation pleine page', () => {
    pathname.current = '/fr/rdv';
    setPage({ scrollHeight: 800 });
    renderCta();

    expect(screen.queryByTestId('floating-cta')).toBeNull();
  });
});
