// src/lib/errors.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@/domain/shared/DomainError';
import { ForbiddenError, UnauthenticatedError, failure, toErrorCode } from './errors';

describe('toErrorCode', () => {
  afterEach(() => vi.restoreAllMocks());

  it('transmet le code métier d\'une DomainError', () => {
    expect(toErrorCode(new DomainError('Créneau pris', 'SLOT_UNAVAILABLE'))).toBe('SLOT_UNAVAILABLE');
  });

  it('traduit les refus d\'accès en codes dédiés', () => {
    expect(toErrorCode(new ForbiddenError())).toBe('FORBIDDEN');
    expect(toErrorCode(new UnauthenticatedError())).toBe('UNAUTHENTICATED');
  });

  it('masque toute erreur inattendue derrière UNKNOWN (jamais de détail technique)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(toErrorCode(new Error('duplicate key value violates unique constraint "uq_slot"'))).toBe('UNKNOWN');
    expect(toErrorCode('chaîne quelconque')).toBe('UNKNOWN');
    expect(toErrorCode(null)).toBe('UNKNOWN');
  });

  it('ne présente plus une panne technique comme un refus de permission', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(toErrorCode(new Error('connection refused'))).not.toBe('FORBIDDEN');
  });
});

describe('failure', () => {
  it('construit un résultat d\'échec typé', () => {
    expect(failure('VALIDATION_FAILED')).toEqual({ success: false, error: 'VALIDATION_FAILED' });
  });
});
