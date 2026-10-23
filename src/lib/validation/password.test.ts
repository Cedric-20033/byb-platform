// src/lib/validation/password.test.ts
import { describe, expect, it } from 'vitest';
import { changePasswordSchema, requestPasswordResetSchema, setPasswordSchema } from './password';

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe('setPasswordSchema', () => {
  it('accepte un mot de passe avec lettre et chiffre, confirmé', () => {
    expect(setPasswordSchema.safeParse({ password: 'chantier2026', confirmPassword: 'chantier2026' }).success).toBe(true);
  });

  it.each([
    ['court', 'abc123', 'passwordTooShort'],
    ['sans chiffre', 'uniquementdeslettres', 'passwordWeak'],
    ['sans lettre', '1234567890123', 'passwordWeak'],
    ['trop long', `a1${'x'.repeat(80)}`, 'passwordTooLong'],
  ])('refuse un mot de passe %s', (_label, password, expected) => {
    expect(firstIssue(setPasswordSchema.safeParse({ password, confirmPassword: password }))).toBe(expected);
  });

  it('refuse une confirmation différente et la rattache au champ de confirmation', () => {
    const result = setPasswordSchema.safeParse({ password: 'chantier2026', confirmPassword: 'chantier2027' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ message: 'passwordMismatch', path: ['confirmPassword'] });
  });

  it('accepte les lettres accentuées comme lettres', () => {
    expect(setPasswordSchema.safeParse({ password: 'éééééééééé1', confirmPassword: 'éééééééééé1' }).success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('exige le mot de passe actuel', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'chantier2026',
      confirmPassword: 'chantier2026',
    });

    expect(result.success).toBe(false);
  });
});

describe('requestPasswordResetSchema', () => {
  it('refuse un email invalide ou une locale inconnue', () => {
    expect(requestPasswordResetSchema.safeParse({ email: 'pas-un-email', locale: 'fr' }).success).toBe(false);
    expect(requestPasswordResetSchema.safeParse({ email: 'ada@byb.be', locale: 'nl' }).success).toBe(false);
    expect(requestPasswordResetSchema.safeParse({ email: 'ada@byb.be', locale: 'fr' }).success).toBe(true);
  });
});
