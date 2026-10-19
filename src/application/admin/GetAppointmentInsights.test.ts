// src/application/admin/GetAppointmentInsights.test.ts
import { describe, expect, it } from 'vitest';
import { GetAppointmentInsights } from './GetAppointmentInsights';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { InMemoryAppointmentRepository } from '@/test/fakes/InMemoryAppointmentRepository';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { FixedClock } from '@/test/fakes/FixedClock';
import { SERVICE_A, SERVICE_B, buildAppointment, buildSlot } from '@/test/fixtures/dashboardFixtures';

// Période analysée : du 19/09/2026 (aujourd'hui − 29 jours) au 18/11/2026 (aujourd'hui + 30 jours).
const NOW = '2026-10-19T10:00:00+02:00';

function build(appointmentsToSeed: ReturnType<typeof buildAppointment>[], slotDates: Record<string, string>) {
  const slots = new InMemorySlotRepository(Object.entries(slotDates).map(([id, date]) => buildSlot(id, date)));
  return new GetAppointmentInsights(new InMemoryAppointmentRepository(slots, appointmentsToSeed), FixedClock.at(NOW));
}

describe('GetAppointmentInsights', () => {
  it('calcule le taux d\'annulation et la répartition sur la période, hors rendez-vous annulés pour la répartition', async () => {
    const insights = await build(
      [
        buildAppointment('a1', 's1', AppointmentStatus.CONFIRMED, SERVICE_A),
        buildAppointment('a2', 's2', AppointmentStatus.CONFIRMED, SERVICE_A),
        buildAppointment('a3', 's3', AppointmentStatus.PENDING, SERVICE_A),
        buildAppointment('a4', 's4', AppointmentStatus.PENDING, SERVICE_B),
        buildAppointment('a5', 's5', AppointmentStatus.CANCELLED, SERVICE_A),
        buildAppointment('a-before', 's-before', AppointmentStatus.CONFIRMED, SERVICE_B),
        buildAppointment('a-after', 's-after', AppointmentStatus.CONFIRMED, SERVICE_B),
      ],
      {
        s1: '2026-09-19', // première journée incluse
        s2: '2026-10-01',
        s3: '2026-10-19',
        s4: '2026-11-18', // dernière journée incluse
        s5: '2026-10-25',
        's-before': '2026-09-18',
        's-after': '2026-11-19',
      },
    ).execute();

    expect(insights).toMatchObject({ from: '2026-09-19', to: '2026-11-18', total: 5, cancelled: 1, cancellationRate: 0.2 });
    expect(insights.byService).toEqual([
      { serviceId: SERVICE_A, count: 3 },
      { serviceId: SERVICE_B, count: 1 },
    ]);
  });

  it('renvoie un taux nul (null, pas 0 %) quand la période est vide', async () => {
    const insights = await build([], {}).execute();

    expect(insights.total).toBe(0);
    expect(insights.cancellationRate).toBeNull();
    expect(insights.byService).toEqual([]);
  });
});
