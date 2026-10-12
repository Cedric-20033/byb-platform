// src/infrastructure/supabase/repositories/SupabaseAppointmentPlanner.test.ts
import { describe, expect, it } from 'vitest';
import { DomainError } from '@/domain/shared/DomainError';
import { ForbiddenError } from '@/lib/errors';
import { toPlannerError } from './SupabaseAppointmentPlanner';

describe('toPlannerError', () => {
  it.each(['APPOINTMENT_NOT_FOUND', 'INVALID_STATUS_TRANSITION', 'SLOT_UNAVAILABLE'] as const)(
    'traduit le message « %s » de la fonction SQL en erreur métier',
    (message) => {
      const error = toPlannerError({ message });

      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe(message);
    },
  );

  it('traduit FORBIDDEN (mise à jour de créneau filtrée par la RLS) en refus d\'accès', () => {
    expect(toPlannerError({ message: 'FORBIDDEN' })).toBeInstanceOf(ForbiddenError);
  });

  it('traduit une violation d\'unicité en créneau indisponible', () => {
    expect((toPlannerError({ code: '23505', message: 'duplicate key' }) as DomainError).code).toBe('SLOT_UNAVAILABLE');
  });

  it('laisse passer une erreur technique inconnue', () => {
    const error = toPlannerError({ code: '42501', message: 'permission denied' });

    expect(error).not.toBeInstanceOf(DomainError);
    expect(error.message).toBe('permission denied');
  });
});
