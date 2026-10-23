// src/application/admin/ExportAppointments.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { OTHER_SERVICE, SERVICE, buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { ExportAppointments } from './ExportAppointments';

const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

async function setup() {
  const world = buildAppointmentWorld([
    slot('s1', '2026-10-20', '09:00', '10:00', SlotStatus.BOOKED),
    slot('s2', '2026-10-21', '14:00', '15:00', SlotStatus.BOOKED, OTHER_SERVICE),
  ]);
  const alice = await world.seedAppointment('s1');
  const bob = await world.seedAppointment('s2', {
    name: 'Bob Dupont',
    email: 'bob@example.com',
    status: AppointmentStatus.CANCELLED,
    serviceId: OTHER_SERVICE,
    notes: null,
  });
  const auditLogger = new FakeAuditLogger();
  return { ...world, alice, bob, auditLogger, exporter: new ExportAppointments(world.appointmentRepository, auditLogger) };
}

describe('ExportAppointments', () => {
  it('aplatit chaque rendez-vous avec les informations de son créneau', async () => {
    const { exporter, alice } = await setup();

    const rows = await exporter.execute({ filters: {}, ...actor });

    expect(rows.find((row) => row.id === alice.id)).toEqual({
      id: alice.id,
      clientName: 'Alice Martin',
      clientEmail: 'alice@example.com',
      clientPhone: '+32 470 12 34 56',
      serviceId: SERVICE,
      subServiceId: null,
      notes: 'Prévoir une échelle',
      status: AppointmentStatus.CONFIRMED,
      slotDate: '2026-10-20',
      slotStartTime: '09:00:00',
      slotEndTime: '10:00:00',
      createdAt: alice.createdAt.toISOString(),
    });
  });

  it('ne renvoie que des données sérialisables (aucune instance de classe)', async () => {
    const { exporter } = await setup();

    const rows = await exporter.execute({ filters: {}, ...actor });

    expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
  });

  it('respecte les filtres actifs : statut, service et période', async () => {
    const { exporter, alice, bob } = await setup();
    const idsFor = async (filters: Parameters<ExportAppointments['execute']>[0]['filters']) =>
      (await exporter.execute({ filters, ...actor })).map((row) => row.id);

    expect(await idsFor({ status: AppointmentStatus.CANCELLED })).toEqual([bob.id]);
    expect(await idsFor({ serviceId: SERVICE })).toEqual([alice.id]);
    expect(await idsFor({ dateFrom: '2026-10-21' })).toEqual([bob.id]);
    expect(await idsFor({ dateTo: '2026-10-20' })).toEqual([alice.id]);
  });

  it('trace l\'export avec le nombre de lignes et les filtres, sans aucune donnée personnelle', async () => {
    const { exporter, auditLogger } = await setup();
    const filters = { status: AppointmentStatus.CONFIRMED };

    await exporter.execute({ filters, ...actor });

    expect(auditLogger.entries).toEqual([
      {
        ...actor,
        action: AuditAction.EXPORT_GENERATED,
        targetType: 'appointment',
        targetId: null,
        metadata: { count: 1, filters },
      },
    ]);
    expect(JSON.stringify(auditLogger.entries)).not.toContain('alice@example.com');
  });

  it('trace aussi un export vide', async () => {
    const { exporter, auditLogger } = await setup();

    const rows = await exporter.execute({ filters: { clientEmail: 'inconnu@example.com' }, ...actor });

    expect(rows).toEqual([]);
    expect(auditLogger.entries[0].metadata).toMatchObject({ count: 0 });
  });
});
