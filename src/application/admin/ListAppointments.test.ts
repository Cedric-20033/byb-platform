// src/application/admin/ListAppointments.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { SlotStatus } from '@/domain/slot/Slot';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { ListAppointments } from './ListAppointments';

type World = ReturnType<typeof buildAppointmentWorld>;

/** Cinq rendez-vous sur cinq jours, noms et statuts variés. */
async function seed(world: World) {
  const rows = [
    { id: 's1', date: '2026-10-20', name: 'Alice Martin', status: AppointmentStatus.CONFIRMED, email: 'alice@example.com', phone: '+32 470 11 11 11' },
    { id: 's2', date: '2026-10-21', name: 'Bruno Leroy', status: AppointmentStatus.PENDING, email: 'bruno@example.com', phone: '+32 470 22 22 22' },
    { id: 's3', date: '2026-10-22', name: 'Chloé Dubois', status: AppointmentStatus.CANCELLED, email: 'chloe@example.com', phone: '+32 470 33 33 33' },
    { id: 's4', date: '2026-10-23', name: 'David Petit', status: AppointmentStatus.CONFIRMED, email: 'david@example.com', phone: '+32 470 44 44 44' },
    { id: 's5', date: '2026-10-24', name: 'Émile Roy', status: AppointmentStatus.PENDING, email: 'emile@example.com', phone: '+32 470 55 55 55' },
  ];
  for (const row of rows) {
    // Le dépôt attribue l'identifiant du créneau : on s'appuie sur celui qu'il renvoie.
    const saved = await world.slotRepository.save(slot('', row.date, '09:00', '10:00', SlotStatus.BOOKED));
    await world.seedAppointment(saved.id, { name: row.name, status: row.status, email: row.email, phone: row.phone });
  }
}

describe('ListAppointments', () => {
  let useCase: ListAppointments;

  beforeEach(async () => {
    const world = buildAppointmentWorld();
    await seed(world);
    useCase = new ListAppointments(world.appointmentRepository);
  });

  const names = (result: Awaited<ReturnType<ListAppointments['execute']>>) => result.items.map((item) => item.appointment.clientName);

  it('trie par défaut du créneau le plus récent au plus ancien', async () => {
    expect(names(await useCase.execute())).toEqual(['Émile Roy', 'David Petit', 'Chloé Dubois', 'Bruno Leroy', 'Alice Martin']);
  });

  it('trie selon le champ et le sens demandés', async () => {
    const byName = await useCase.execute({ sortField: 'clientName', direction: 'asc' });

    expect(names(byName)).toEqual(['Alice Martin', 'Bruno Leroy', 'Chloé Dubois', 'David Petit', 'Émile Roy']);
  });

  it('pagine et renvoie le total de l\'ensemble filtré', async () => {
    const second = await useCase.execute({ page: 2, pageSize: 2 });

    expect(names(second)).toEqual(['Chloé Dubois', 'Bruno Leroy']);
    expect(second).toMatchObject({ total: 5, page: 2, pageSize: 2 });
  });

  it('sert la dernière page existante quand la page demandée est trop haute', async () => {
    const result = await useCase.execute({ page: 9, pageSize: 2 });

    expect(result.page).toBe(3);
    expect(names(result)).toEqual(['Alice Martin']);
  });

  it('cherche dans le nom, l\'email et le téléphone sans tenir compte de la casse', async () => {
    expect(names(await useCase.execute({ filters: { query: 'ALICE' } }))).toEqual(['Alice Martin']);
    expect(names(await useCase.execute({ filters: { query: 'david@' } }))).toEqual(['David Petit']);
    expect(names(await useCase.execute({ filters: { query: '33 33' } }))).toEqual(['Chloé Dubois']);
  });

  it('combine recherche texte, statut et période, et le total suit les filtres', async () => {
    const result = await useCase.execute({
      filters: { status: AppointmentStatus.PENDING, dateFrom: '2026-10-22' },
    });

    expect(names(result)).toEqual(['Émile Roy']);
    expect(result.total).toBe(1);
  });

  it('renvoie une page vide et un total nul quand rien ne correspond', async () => {
    expect(await useCase.execute({ filters: { query: 'introuvable' } })).toMatchObject({ items: [], total: 0, page: 1 });
  });
});
