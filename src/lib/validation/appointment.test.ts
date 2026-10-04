// src/lib/validation/appointment.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appointmentSearchFiltersSchema,
  blockSlotSchema,
  cancelAppointmentByTokenSchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  createHolidaySchema,
  generateAvailableSlotsSchema,
  getAvailableSlotsSchema,
} from './appointment';
import { VALIDATION_MESSAGE_KEYS, isValidationMessageKey } from './messages';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

/** Messages d'erreur d'un `safeParse` (typage structurel : indifférent à la forme exacte du résultat Zod). */
function messagesOf(result: { success: boolean; error?: { issues: { message: string }[] } }): string[] {
  return result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message);
}

describe('schémas de validation — messages sous forme de clés', () => {
  const invalidPayloads: [string, string[]][] = [
    [
      'createAppointment',
      messagesOf(
        createAppointmentSchema.safeParse({
          slotId: 'x',
          serviceId: 'x',
          subServiceId: 'x',
          clientName: 'a',
          clientEmail: 'pas-un-email',
          clientPhone: 'abc',
          notes: 'x'.repeat(501),
        }),
      ),
    ],
    ['createAppointment (nom trop long)', messagesOf(createAppointmentSchema.safeParse({
      slotId: VALID_UUID, serviceId: VALID_UUID, clientName: 'x'.repeat(101),
      clientEmail: 'a@b.be', clientPhone: '+32 470 00 00 00',
    }))],
    ['cancelByToken', messagesOf(cancelAppointmentByTokenSchema.safeParse({ token: 'x' }))],
    ['getAvailableSlots', messagesOf(getAvailableSlotsSchema.safeParse({ serviceId: 'x', from: 'x', to: 'x' }))],
    ['getAvailableSlots (période inversée)', messagesOf(getAvailableSlotsSchema.safeParse({
      serviceId: VALID_UUID, from: '2026-10-10', to: '2026-10-01',
    }))],
    ['blockSlot', messagesOf(blockSlotSchema.safeParse({ slotId: 'x' }))],
    [
      'generateSlots (formats)',
      messagesOf(
        generateAvailableSlotsSchema.safeParse({
          serviceId: 'x', from: 'x', to: 'x', dailyStartTime: 'x', dailyEndTime: 'x', slotDurationMinutes: Number.NaN,
        }),
      ),
    ],
    [
      'generateSlots (règles croisées)',
      messagesOf(
        generateAvailableSlotsSchema.safeParse({
          serviceId: VALID_UUID, from: '2026-10-10', to: '2026-10-01',
          dailyStartTime: '18:00', dailyEndTime: '08:00', slotDurationMinutes: 5,
        }),
      ),
    ],
    ['generateSlots (durée hors bornes)', messagesOf(generateAvailableSlotsSchema.safeParse({
      serviceId: VALID_UUID, from: '2026-10-01', to: '2026-10-02',
      dailyStartTime: '08:00', dailyEndTime: '18:00', slotDurationMinutes: 600,
    }))],
    ['createHoliday', messagesOf(createHolidaySchema.safeParse({ date: 'x', label: 'a' }))],
    ['createHoliday (libellé trop long)', messagesOf(createHolidaySchema.safeParse({
      date: '2026-12-25', label: 'x'.repeat(101),
    }))],
    ['cancelAppointment', messagesOf(cancelAppointmentSchema.safeParse({ appointmentId: 'x', reason: 'x'.repeat(501) }))],
  ];

  it.each(invalidPayloads)('%s : chaque message est une clé connue', (_name, messages) => {
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) {
      expect(isValidationMessageKey(message), `message non traduisible : "${message}"`).toBe(true);
    }
  });

  it('accepte une saisie valide', () => {
    expect(
      createAppointmentSchema.safeParse({
        slotId: VALID_UUID, serviceId: VALID_UUID, clientName: 'Marc Lefebvre',
        clientEmail: 'marc@example.be', clientPhone: '+32 470 12 34 56',
      }).success,
    ).toBe(true);
    expect(appointmentSearchFiltersSchema.safeParse({}).success).toBe(true);
  });
});

describe('messages de validation — traductions', () => {
  it.each(['fr', 'en', 'de'])('%s traduit exactement les clés déclarées', (locale) => {
    const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));
    const translated = messages.errors.validation as Record<string, string>;

    expect(Object.keys(translated).sort()).toEqual([...VALIDATION_MESSAGE_KEYS].sort());
    for (const text of Object.values(translated)) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});
