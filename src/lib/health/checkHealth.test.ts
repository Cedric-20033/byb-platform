// src/lib/health/checkHealth.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkHealth } from './checkHealth';

const NOW = () => new Date('2026-10-21T08:00:00.000Z');

describe('checkHealth', () => {
  afterEach(() => vi.useRealTimers());

  it('renvoie ok quand la base répond', async () => {
    const report = await checkHealth(async () => undefined, NOW);

    expect(report).toEqual({ status: 'ok', checks: { database: 'ok' }, timestamp: '2026-10-21T08:00:00.000Z' });
  });

  it('renvoie degraded, sans détail, quand la base échoue', async () => {
    const report = await checkHealth(async () => {
      throw new Error('password authentication failed for user "postgres"');
    }, NOW);

    expect(report.status).toBe('degraded');
    expect(report.checks.database).toBe('down');
    expect(JSON.stringify(report)).not.toContain('password');
  });

  it('juge la base en panne si elle ne répond pas dans le délai', async () => {
    vi.useFakeTimers();
    const pending = checkHealth(() => new Promise<void>(() => undefined), NOW);

    await vi.advanceTimersByTimeAsync(3100);

    expect((await pending).checks.database).toBe('down');
  });
});
