// src/lib/validation/slotsBulk.test.ts
import { describe, expect, it } from 'vitest';
import { blockSlotsInRangeSchema, deleteAvailableSlotsSchema, listSlotsByRangeSchema } from './appointment';

const SERVICE_ID = '44444444-4444-4444-8444-444444444444';
const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('blockSlotsInRangeSchema', () => {
  const base = { from: '2026-10-20', to: '2026-10-24' };

  it('accepte une période seule, tous services confondus', () => {
    expect(blockSlotsInRangeSchema.safeParse(base).success).toBe(true);
  });

  it('accepte un service et une plage horaire', () => {
    const result = blockSlotsInRangeSchema.safeParse({ ...base, serviceId: SERVICE_ID, startTime: '12:00', endTime: '14:00' });

    expect(result.success).toBe(true);
  });

  it('refuse une fin antérieure au début', () => {
    expect(messagesOf(blockSlotsInRangeSchema.safeParse({ from: '2026-10-24', to: '2026-10-20' }))).toContain('startDateAfterEnd');
  });

  it('refuse une période de plus d\'un an', () => {
    expect(blockSlotsInRangeSchema.safeParse({ from: '2026-01-01', to: '2027-06-01' }).success).toBe(false);
  });

  it('refuse une plage horaire à une seule borne', () => {
    expect(blockSlotsInRangeSchema.safeParse({ ...base, startTime: '12:00' }).success).toBe(false);
    expect(blockSlotsInRangeSchema.safeParse({ ...base, endTime: '14:00' }).success).toBe(false);
  });

  it('refuse une plage horaire dont la fin ne suit pas le début', () => {
    const result = blockSlotsInRangeSchema.safeParse({ ...base, startTime: '14:00', endTime: '12:00' });

    expect(messagesOf(result)).toContain('startTimeAfterEnd');
  });

  it('refuse un identifiant de service invalide', () => {
    expect(blockSlotsInRangeSchema.safeParse({ ...base, serviceId: 'toiture' }).success).toBe(false);
  });
});

describe('deleteAvailableSlotsSchema', () => {
  it('accepte une période, avec ou sans service', () => {
    expect(deleteAvailableSlotsSchema.safeParse({ from: '2026-10-20', to: '2026-10-24' }).success).toBe(true);
    expect(deleteAvailableSlotsSchema.safeParse({ from: '2026-10-20', to: '2026-10-24', serviceId: SERVICE_ID }).success).toBe(true);
  });

  it('refuse une période inversée ou démesurée', () => {
    expect(deleteAvailableSlotsSchema.safeParse({ from: '2026-10-24', to: '2026-10-20' }).success).toBe(false);
    expect(deleteAvailableSlotsSchema.safeParse({ from: '2020-01-01', to: '2026-01-01' }).success).toBe(false);
  });
});

describe('listSlotsByRangeSchema', () => {
  it('accepte une semaine', () => {
    expect(listSlotsByRangeSchema.safeParse({ from: '2026-10-19', to: '2026-10-25' }).success).toBe(true);
  });

  it('refuse plus d\'un mois : la vue semaine n\'a pas à rapatrier tout le calendrier', () => {
    expect(listSlotsByRangeSchema.safeParse({ from: '2026-10-01', to: '2026-12-01' }).success).toBe(false);
  });
});
