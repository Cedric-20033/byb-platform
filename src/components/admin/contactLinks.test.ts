// src/components/admin/contactLinks.test.ts
import { describe, expect, it } from 'vitest';
import { toMailtoHref, toTelHref } from './contactLinks';

describe('toMailtoHref', () => {
  it('préfixe l\'adresse par mailto:', () => {
    expect(toMailtoHref('alice@example.com')).toBe('mailto:alice%40example.com');
  });

  it('neutralise les caractères capables d\'injecter des paramètres (?subject=, &cc=)', () => {
    expect(toMailtoHref('a@b.com?cc=x@y.com')).not.toContain('?');
  });
});

describe('toTelHref', () => {
  it('retire les séparateurs de saisie', () => {
    expect(toTelHref('04 12.34-56 78')).toBe('tel:0412345678');
  });

  it('conserve le « + » de l\'indicatif international', () => {
    expect(toTelHref('+32 470 12 34 56')).toBe('tel:+32470123456');
  });
});
