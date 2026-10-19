// src/application/admin/GetUpcomingAppointments.test.ts
import { describe, expect, it } from 'vitest';
import { GetUpcomingAppointments } from './GetUpcomingAppointments';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { InMemoryAppointmentRepository } from '@/test/fakes/InMemoryAppointmentRepository';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { FixedClock } from '@/test/fakes/FixedClock';
import { buildAppointment, buildSlot } from '@/test/fixtures/dashboardFixtures';

// Lundi 19 octobre 2026, 10h00 à Bruxelles.
const NOW = '2026-10-19T10:00:00+02:00';

function build() {
  const slots = new InMemorySlotRepository([
    buildSlot('s-ended', '2026-10-19', undefined, '08:00', '09:00'),
    buildSlot('s-ongoing', '2026-10-19', undefined, '09:30', '10:30'),
    buildSlot('s-later', '2026-10-19', undefined, '15:00', '16:00'),
    buildSlot('s-tomorrow', '2026-10-20'),
    buildSlot('s-cancelled', '2026-10-21'),
    buildSlot('s-far', '2026-12-01'),
  ]);
  const appointments = new InMemoryAppointmentRepository(slots, [
    buildAppointment('a-ended', 's-ended'),
    buildAppointment('a-ongoing', 's-ongoing'),
    buildAppointment('a-later', 's-later', AppointmentStatus.PENDING),
    buildAppointment('a-tomorrow', 's-tomorrow'),
    buildAppointment('a-cancelled', 's-cancelled', AppointmentStatus.CANCELLED),
    buildAppointment('a-far', 's-far'),
  ]);
  return new GetUpcomingAppointments(appointments, FixedClock.at(NOW));
}

describe('GetUpcomingAppointments', () => {
  it('garde le rendez-vous en cours, écarte le terminé, l\'annulé et le trop lointain, du plus proche au plus lointain', async () => {
    const upcoming = await build().execute();

    expect(upcoming.map((item) => item.appointment.id)).toEqual(['a-ongoing', 'a-later', 'a-tomorrow']);
  });

  it('respecte la limite demandée', async () => {
    const upcoming = await build().execute(2);

    expect(upcoming.map((item) => item.appointment.id)).toEqual(['a-ongoing', 'a-later']);
  });

  it('juge « terminé » selon l\'heure belge, pas selon l\'heure UTC (régression fuseau)', async () => {
    // 22h30 UTC le 19/10 = 00h30 le 20/10 à Bruxelles : les créneaux du 19 sont tous passés.
    const slots = new InMemorySlotRepository([buildSlot('s-evening', '2026-10-19', undefined, '18:00', '19:00')]);
    const appointments = new InMemoryAppointmentRepository(slots, [buildAppointment('a-evening', 's-evening')]);

    const upcoming = await new GetUpcomingAppointments(appointments, FixedClock.at('2026-10-19T22:30:00Z')).execute();

    expect(upcoming).toEqual([]);
  });
});
