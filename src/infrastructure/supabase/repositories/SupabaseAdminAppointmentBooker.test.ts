// src/infrastructure/supabase/repositories/SupabaseAdminAppointmentBooker.test.ts
import { describe, expect, it } from 'vitest';
import { DomainError } from '@/domain/shared/DomainError';
import { toBookingError } from './SupabaseAdminAppointmentBooker';

describe('toBookingError', () => {
  it.each(['SLOT_UNAVAILABLE', 'SERVICE_NOT_FOUND', 'SUB_SERVICE_NOT_FOUND'] as const)(
    'traduit le message « %s » de la fonction SQL en erreur métier',
    (message) => {
      const error = toBookingError({ message });

      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe(message);
    },
  );

  it('traduit une violation d\'unicité (course sur le créneau) en créneau indisponible', () => {
    const error = toBookingError({ code: '23505', message: 'duplicate key value violates unique constraint' });

    expect((error as DomainError).code).toBe('SLOT_UNAVAILABLE');
  });

  it('traduit une violation de clé étrangère en service introuvable', () => {
    const error = toBookingError({ code: '23503', message: 'violates foreign key constraint' });

    expect((error as DomainError).code).toBe('SERVICE_NOT_FOUND');
  });

  it('laisse passer une erreur technique inconnue sans la déguiser en erreur métier', () => {
    const error = toBookingError({ code: '42501', message: 'permission denied' });

    expect(error).not.toBeInstanceOf(DomainError);
    expect(error.message).toBe('permission denied');
  });
});
