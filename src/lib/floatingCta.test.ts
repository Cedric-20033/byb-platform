// src/lib/floatingCta.test.ts
import { describe, expect, it } from 'vitest';
import { FLOATING_CTA_SCROLL_THRESHOLD, shouldShowFloatingCta } from './floatingCta';

const LONG_PAGE = { scrollHeight: 4000, viewportHeight: 800 };

describe('shouldShowFloatingCta', () => {
  it('reste caché en haut d\'une page longue', () => {
    expect(shouldShowFloatingCta({ ...LONG_PAGE, scrollY: 0 })).toBe(false);
    expect(shouldShowFloatingCta({ ...LONG_PAGE, scrollY: FLOATING_CTA_SCROLL_THRESHOLD })).toBe(false);
  });

  it('apparaît dès que le seuil est dépassé', () => {
    expect(shouldShowFloatingCta({ ...LONG_PAGE, scrollY: FLOATING_CTA_SCROLL_THRESHOLD + 1 })).toBe(true);
  });

  it('reste affiché tout en bas de la page', () => {
    expect(shouldShowFloatingCta({ ...LONG_PAGE, scrollY: 3200 })).toBe(true);
  });

  it('est affiché d\'emblée sur une page qui ne défile pas (404, mentions légales)', () => {
    expect(shouldShowFloatingCta({ scrollHeight: 800, viewportHeight: 800, scrollY: 0 })).toBe(true);
  });

  it('est affiché d\'emblée quand la page défile moins que le seuil', () => {
    expect(shouldShowFloatingCta({ scrollHeight: 1000, viewportHeight: 800, scrollY: 0 })).toBe(true);
    expect(shouldShowFloatingCta({ scrollHeight: 1100, viewportHeight: 800, scrollY: 0 })).toBe(true);
  });

  it('se cache en haut dès que la page peut défiler plus que le seuil', () => {
    expect(shouldShowFloatingCta({ scrollHeight: 1101, viewportHeight: 800, scrollY: 0 })).toBe(false);
  });
});
