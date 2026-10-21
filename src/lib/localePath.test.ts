// src/lib/localePath.test.ts
import { describe, expect, it } from 'vitest';
import { switchLocalePath } from './localePath';

describe('switchLocalePath', () => {
  it('remplace uniquement le préfixe de locale', () => {
    expect(switchLocalePath('/fr/services/toiture', 'de')).toBe('/de/services/toiture');
    expect(switchLocalePath('/en/dashboard/appointments', 'fr')).toBe('/fr/dashboard/appointments');
  });

  it('gère la page d\'accueil', () => {
    expect(switchLocalePath('/fr', 'en')).toBe('/en');
  });

  it('ajoute le préfixe quand il manque', () => {
    expect(switchLocalePath('/', 'en')).toBe('/en');
    expect(switchLocalePath('/contact', 'de')).toBe('/de/contact');
  });

  it('ne confond pas un segment ressemblant à une locale avec le préfixe', () => {
    expect(switchLocalePath('/fr/en', 'de')).toBe('/de/en');
  });
});
