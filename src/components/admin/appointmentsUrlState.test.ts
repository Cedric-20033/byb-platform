// src/components/admin/appointmentsUrlState.test.ts
import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import {
  DEFAULT_LIST_STATE,
  buildOpenAppointmentQuery,
  parseListState,
  parseOpenAppointmentId,
  serializeListState,
  toggleSort,
  type AppointmentsListState,
} from './appointmentsUrlState';

const SERVICE_ID = '44444444-4444-4444-8444-444444444444';

describe('parseListState', () => {
  it('renvoie l\'état par défaut pour une URL sans paramètre', () => {
    expect(parseListState(new URLSearchParams())).toEqual(DEFAULT_LIST_STATE);
  });

  it('lit les filtres, la page et le tri', () => {
    const state = parseListState(
      new URLSearchParams(`q=alice&status=pending&service=${SERVICE_ID}&from=2026-10-01&to=2026-10-31&page=3&sort=clientName&dir=asc`),
    );

    expect(state).toEqual({
      filters: { query: 'alice', status: AppointmentStatus.PENDING, serviceId: SERVICE_ID, dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      page: 3,
      sort: 'clientName',
      direction: 'asc',
    });
  });

  it('ignore les valeurs invalides au lieu de planter (l\'URL est modifiable à la main)', () => {
    const state = parseListState(
      new URLSearchParams('status=inconnu&service=pas-un-uuid&from=hier&page=-2&sort=password&dir=sideways'),
    );

    expect(state).toEqual(DEFAULT_LIST_STATE);
  });

  it('rejette une page non entière ou nulle', () => {
    expect(parseListState(new URLSearchParams('page=0')).page).toBe(1);
    expect(parseListState(new URLSearchParams('page=abc')).page).toBe(1);
  });
});

describe('serializeListState', () => {
  it('omet toutes les valeurs par défaut', () => {
    expect(serializeListState(DEFAULT_LIST_STATE).toString()).toBe('');
  });

  it('est l\'inverse de parseListState', () => {
    const state: AppointmentsListState = {
      filters: { query: 'alice martin', status: AppointmentStatus.CONFIRMED, dateFrom: '2026-10-01' },
      page: 2,
      sort: 'createdAt',
      direction: 'asc',
    };

    expect(parseListState(serializeListState(state))).toEqual(state);
  });
});

describe('lien profond vers une fiche', () => {
  const ID = '22222222-2222-4222-8222-222222222222';

  it('filtre sur les demandes en attente, les plus récentes d\u2019abord, et porte l\u2019identifiant', () => {
    const params = new URLSearchParams(buildOpenAppointmentQuery(ID));

    expect(params.get('open')).toBe(ID);
    expect(parseListState(params)).toMatchObject({
      filters: { status: 'pending' },
      sort: 'createdAt',
      direction: 'desc',
      page: 1,
    });
  });

  it('retrouve l\u2019identifiant dans l\u2019URL', () => {
    expect(parseOpenAppointmentId(ID)).toBe(ID);
  });

  it('ignore une valeur absente ou qui n\u2019est pas un identifiant', () => {
    expect(parseOpenAppointmentId(null)).toBeNull();
    expect(parseOpenAppointmentId(undefined)).toBeNull();
    expect(parseOpenAppointmentId('../../etc/passwd')).toBeNull();
  });
});

describe('toggleSort', () => {
  it('inverse le sens quand on reclique sur la colonne active', () => {
    const asc = toggleSort(DEFAULT_LIST_STATE, 'slotDate');

    expect(asc).toMatchObject({ sort: 'slotDate', direction: 'asc' });
    expect(toggleSort(asc, 'slotDate').direction).toBe('desc');
  });

  it('prend le sens naturel d\'une nouvelle colonne : dates décroissantes, texte croissant', () => {
    expect(toggleSort(DEFAULT_LIST_STATE, 'clientName')).toMatchObject({ sort: 'clientName', direction: 'asc' });
    expect(toggleSort({ ...DEFAULT_LIST_STATE, sort: 'clientName', direction: 'asc' }, 'createdAt')).toMatchObject({
      sort: 'createdAt',
      direction: 'desc',
    });
  });

  it('revient à la première page et conserve les filtres', () => {
    const state: AppointmentsListState = { ...DEFAULT_LIST_STATE, page: 4, filters: { query: 'alice' } };

    expect(toggleSort(state, 'status')).toMatchObject({ page: 1, filters: { query: 'alice' } });
  });
});
