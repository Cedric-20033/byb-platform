// src/infrastructure/supabase/repositories/SupabaseAppointmentRepository.save.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import { DomainError } from '@/domain/shared/DomainError';
import { SupabaseAppointmentRepository } from './SupabaseAppointmentRepository';

/** Client minimal : `from().insert().select().single()` renvoie le résultat voulu. */
function clientReturning(result: { data: null; error: { code: string; message: string } }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { client: { from } as unknown as SupabaseClient<Database> };
}

const draft = new Appointment(
  '',
  'slot-1',
  'service-1',
  null,
  'alice@example.com',
  'Alice Martin',
  '+32 470 12 34 56',
  null,
  AppointmentStatus.PENDING,
  new Date('2026-10-15T10:00:00+02:00'),
  'fr',
);

describe('SupabaseAppointmentRepository.save', () => {
  it('traduit la violation de l\'index unique des rendez-vous actifs en « créneau indisponible »', async () => {
    // Deux visiteurs sur le même créneau : le second INSERT échoue en 23505. Il doit apprendre que le créneau
    // vient d'être pris (et se voir proposer d'en choisir un autre), pas qu'une « erreur inattendue » s'est produite.
    const { client } = clientReturning({ data: null, error: { code: '23505', message: 'duplicate key value' } });

    const attempt = new SupabaseAppointmentRepository(client).save(draft);

    await expect(attempt).rejects.toBeInstanceOf(DomainError);
    await expect(attempt).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('laisse remonter toute autre erreur telle quelle, sans la déguiser en créneau pris', async () => {
    const { client } = clientReturning({ data: null, error: { code: '42501', message: 'permission denied' } });

    const attempt = new SupabaseAppointmentRepository(client).save(draft);

    await expect(attempt).rejects.toThrow('permission denied');
    await expect(attempt).rejects.not.toBeInstanceOf(DomainError);
  });
});
