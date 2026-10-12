// src/application/admin/GetAppointmentHistory.test.ts
import { describe, expect, it } from 'vitest';
import { AuditAction } from '@/domain/shared/AuditLogger';
import { InMemoryAuditLogReader } from '@/test/fakes/InMemoryAuditLogReader';
import { buildAuditLogEntry } from '@/test/fixtures/buildAuditLogEntry';
import { GetAppointmentHistory } from './GetAppointmentHistory';

const APPOINTMENT_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_APPOINTMENT_ID = '33333333-3333-4333-8333-333333333333';

const forAppointment = (n: number, action: AuditAction, targetId = APPOINTMENT_ID) =>
  buildAuditLogEntry(n, { action, targetType: 'appointment', targetId });

describe('GetAppointmentHistory', () => {
  it('renvoie la chronologie du rendez-vous, du plus ancien au plus récent', async () => {
    const reader = new InMemoryAuditLogReader([
      forAppointment(3, AuditAction.APPOINTMENT_CANCELLED),
      forAppointment(1, AuditAction.APPOINTMENT_CREATED),
      forAppointment(2, AuditAction.APPOINTMENT_CONFIRMED),
    ]);

    const history = await new GetAppointmentHistory(reader).execute(APPOINTMENT_ID);

    expect(history.map((entry) => entry.action)).toEqual([
      AuditAction.APPOINTMENT_CREATED,
      AuditAction.APPOINTMENT_CONFIRMED,
      AuditAction.APPOINTMENT_CANCELLED,
    ]);
  });

  it('ignore les autres rendez-vous et les autres types de cible', async () => {
    const reader = new InMemoryAuditLogReader([
      forAppointment(1, AuditAction.APPOINTMENT_CREATED),
      forAppointment(2, AuditAction.APPOINTMENT_CREATED, OTHER_APPOINTMENT_ID),
      // Même identifiant mais cible d'un autre type : ne doit jamais remonter.
      buildAuditLogEntry(3, { action: AuditAction.SLOT_BLOCKED, targetType: 'slot', targetId: APPOINTMENT_ID }),
    ]);

    const history = await new GetAppointmentHistory(reader).execute(APPOINTMENT_ID);

    expect(history).toHaveLength(1);
    expect(history[0].targetId).toBe(APPOINTMENT_ID);
  });

  it('renvoie une liste vide quand rien n\'est enregistré', async () => {
    const history = await new GetAppointmentHistory(new InMemoryAuditLogReader()).execute(APPOINTMENT_ID);

    expect(history).toEqual([]);
  });
});
