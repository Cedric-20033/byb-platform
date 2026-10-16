// @vitest-environment jsdom
// src/components/booking/useAvailableSlots.test.tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SlotDTO } from '@/app/actions/booking/getAvailableSlots';
import { SLOT_REFRESH_INTERVAL_MS, useAvailableSlots } from './useAvailableSlots';

// `vi.hoisted` : la fabrique de vi.mock s'exécute avant les imports, le mock doit donc exister avant elle.
const { getAvailableSlotsAction } = vi.hoisted(() => ({ getAvailableSlotsAction: vi.fn() }));
vi.mock('@/app/actions/booking/getAvailableSlots', () => ({ getAvailableSlotsAction }));

const SERVICE = '11111111-1111-4111-8111-111111111111';

const slot = (id: string, startTime: string): SlotDTO => ({
  id,
  date: '2026-10-20',
  startTime: `${startTime}:00`,
  endTime: '10:00:00',
  serviceId: SERVICE,
});
const ok = (...slots: SlotDTO[]) => ({ success: true, slots });

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Laisse les promesses en attente se résoudre sans faire avancer l'horloge simulée. */
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  getAvailableSlotsAction.mockReset();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAvailableSlots', () => {
  it('charge les créneaux du jour demandé', async () => {
    getAvailableSlotsAction.mockResolvedValue(ok(slot('a', '09:00')));
    const { result } = renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));

    expect(result.current.isLoading).toBe(true);
    await flush();

    expect(result.current).toEqual({ slots: [slot('a', '09:00')], isLoading: false, error: null });
    expect(getAvailableSlotsAction).toHaveBeenCalledWith({ serviceId: SERVICE, from: '2026-10-20', to: '2026-10-20' });
  });

  it('se rafraîchit seul : un créneau pris par un autre visiteur disparaît', async () => {
    getAvailableSlotsAction
      .mockResolvedValueOnce(ok(slot('a', '09:00'), slot('b', '09:30')))
      .mockResolvedValue(ok(slot('b', '09:30')));
    const { result } = renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));
    await flush();
    expect(result.current.slots.map((s) => s.id)).toEqual(['a', 'b']);

    await tick(SLOT_REFRESH_INTERVAL_MS);

    expect(result.current.slots.map((s) => s.id)).toEqual(['b']);
    expect(result.current.isLoading).toBe(false);
  });

  it('ne repasse pas en chargement pendant un rafraîchissement', async () => {
    getAvailableSlotsAction.mockResolvedValue(ok(slot('a', '09:00')));
    const { result } = renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));
    await flush();

    await tick(SLOT_REFRESH_INTERVAL_MS - 1);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.slots).toHaveLength(1);
  });

  it('suspend l\'interrogation quand l\'onglet est caché', async () => {
    getAvailableSlotsAction.mockResolvedValue(ok());
    renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));
    await flush();
    getAvailableSlotsAction.mockClear();

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    });
    await tick(SLOT_REFRESH_INTERVAL_MS * 3);

    expect(getAvailableSlotsAction).not.toHaveBeenCalled();
  });

  it('relit aussitôt au retour sur l\'onglet', async () => {
    getAvailableSlotsAction.mockResolvedValue(ok());
    renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));
    await flush();
    getAvailableSlotsAction.mockClear();

    act(() => setVisibility('visible'));
    await flush();

    expect(getAvailableSlotsAction).toHaveBeenCalledTimes(1);
  });

  it('garde la grille affichée quand un rafraîchissement échoue', async () => {
    getAvailableSlotsAction
      .mockResolvedValueOnce(ok(slot('a', '09:00')))
      .mockResolvedValue({ success: false, error: 'UNKNOWN' });
    const { result } = renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));
    await flush();

    await tick(SLOT_REFRESH_INTERVAL_MS);

    expect(result.current.slots).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('signale l\'erreur quand le premier chargement échoue', async () => {
    getAvailableSlotsAction.mockResolvedValue({ success: false, error: 'UNKNOWN' });
    const { result } = renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));

    await flush();

    expect(result.current).toEqual({ slots: [], isLoading: false, error: 'UNKNOWN' });
  });

  it('repasse en chargement et n\'affiche pas les créneaux de la veille quand la date change', async () => {
    getAvailableSlotsAction.mockResolvedValueOnce(ok(slot('a', '09:00'))).mockResolvedValue(ok(slot('z', '15:00')));
    const { result, rerender } = renderHook(({ date }) => useAvailableSlots(SERVICE, date), {
      initialProps: { date: '2026-10-20' },
    });
    await flush();

    rerender({ date: '2026-10-21' });

    expect(result.current).toEqual({ slots: [], isLoading: true, error: null });
    await flush();
    expect(result.current.slots.map((s) => s.id)).toEqual(['z']);
  });

  it('arrête d\'interroger au démontage', async () => {
    getAvailableSlotsAction.mockResolvedValue(ok());
    const { unmount } = renderHook(() => useAvailableSlots(SERVICE, '2026-10-20'));
    await flush();
    unmount();
    getAvailableSlotsAction.mockClear();

    await tick(SLOT_REFRESH_INTERVAL_MS * 3);
    act(() => setVisibility('visible'));

    expect(getAvailableSlotsAction).not.toHaveBeenCalled();
  });
});
