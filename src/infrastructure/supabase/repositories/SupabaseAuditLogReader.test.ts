// src/infrastructure/supabase/repositories/SupabaseAuditLogReader.test.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { Database } from '@/types/database';
import { SupabaseAuditLogReader } from './SupabaseAuditLogReader';

type Call = [method: string, ...args: unknown[]];
type Result = { data: unknown[] | null; error: { message: string } | null };

/**
 * Faux client PostgREST : enregistre chaque appel de la chaîne de requête et renvoie
 * le résultat prévu au `await` final (le builder est « thenable », comme le vrai).
 */
function fakeClient(result: Result) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'lt', 'or', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: Result) => unknown) => resolve(result);

  const client = { from: (table: string) => (calls.push(['from', table]), builder) };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

const row = (n: number, overrides: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  actor_id: null,
  actor_role: 'admin',
  action: 'SLOT_BLOCKED',
  target_type: 'slot',
  target_id: null,
  metadata: {},
  ip_address: null,
  created_at: `2026-10-06T12:00:0${n}+00:00`,
  actor: null,
  ...overrides,
});

const find = (calls: Call[], method: string) => calls.filter(([m]) => m === method);

describe('SupabaseAuditLogReader', () => {
  it('interroge audit_logs avec le tri total et une ligne de plus que la limite', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await new SupabaseAuditLogReader(client).search({}, { limit: 50, after: null });

    expect(calls[0]).toEqual(['from', 'audit_logs']);
    expect(find(calls, 'order')).toEqual([
      ['order', 'created_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
    ]);
    expect(find(calls, 'limit')).toEqual([['limit', 51]]);
    expect(find(calls, 'or')).toEqual([]);
  });

  it('traduit chaque critère en filtre', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await new SupabaseAuditLogReader(client).search(
      {
        actorId: 'a',
        actorRole: 'admin' as never,
        action: 'X',
        targetType: 't',
        targetId: 'i',
        occurredFrom: '2026-10-01T00:00:00.000Z',
        occurredBefore: '2026-10-02T00:00:00.000Z',
      },
      { limit: 10, after: null },
    );

    expect(find(calls, 'eq')).toEqual([
      ['eq', 'actor_id', 'a'],
      ['eq', 'actor_role', 'admin'],
      ['eq', 'action', 'X'],
      ['eq', 'target_type', 't'],
      ['eq', 'target_id', 'i'],
    ]);
    expect(find(calls, 'gte')).toEqual([['gte', 'created_at', '2026-10-01T00:00:00.000Z']]);
    expect(find(calls, 'lt')).toEqual([['lt', 'created_at', '2026-10-02T00:00:00.000Z']]);
  });

  it('construit le filtre keyset à partir du curseur', async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    const after = { createdAt: '2026-10-06T12:00:05.000Z', id: '00000000-0000-4000-8000-000000000005' };
    await new SupabaseAuditLogReader(client).search({}, { limit: 10, after });

    expect(find(calls, 'or')).toEqual([
      [
        'or',
        `created_at.lt.${after.createdAt},and(created_at.eq.${after.createdAt},id.lt.${after.id})`,
      ],
    ]);
  });

  it('renvoie la page complète sans curseur quand il n’y a pas de ligne excédentaire', async () => {
    const { client } = fakeClient({ data: [row(2), row(1)], error: null });
    const page = await new SupabaseAuditLogReader(client).search({}, { limit: 2, after: null });

    expect(page.entries).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('retire la ligne excédentaire et fournit un curseur normalisé en Z', async () => {
    const { client } = fakeClient({ data: [row(3), row(2), row(1)], error: null });
    const page = await new SupabaseAuditLogReader(client).search({}, { limit: 2, after: null });

    expect(page.entries.map((e) => e.id.slice(-1))).toEqual(['3', '2']);
    expect(page.nextCursor).toEqual({ createdAt: '2026-10-06T12:00:02Z', id: row(2).id });
  });

  it('mappe l’auteur, qu’il soit un objet ou un tableau', async () => {
    const author = { full_name: 'Jean Dupont', email: 'jean@byb.be' };
    const { client } = fakeClient({
      data: [row(2, { actor: author }), row(1, { actor: [author] })],
      error: null,
    });
    const { entries } = await new SupabaseAuditLogReader(client).search({}, { limit: 5, after: null });

    for (const entry of entries) {
      expect(entry.actorName).toBe('Jean Dupont');
      expect(entry.actorEmail).toBe('jean@byb.be');
    }
  });

  it('laisse nom et email à null quand le profil est masqué ou supprimé', async () => {
    const { client } = fakeClient({ data: [row(1)], error: null });
    const [entry] = (await new SupabaseAuditLogReader(client).search({}, { limit: 5, after: null })).entries;

    expect(entry.actorName).toBeNull();
    expect(entry.actorEmail).toBeNull();
  });

  it('enveloppe un metadata qui n’est pas un objet', async () => {
    const { client } = fakeClient({ data: [row(1, { metadata: [1, 2] })], error: null });
    const [entry] = (await new SupabaseAuditLogReader(client).search({}, { limit: 5, after: null })).entries;

    expect(entry.metadata).toEqual({ value: [1, 2] });
  });

  it('rejette un rôle d’auteur inconnu', async () => {
    const { client } = fakeClient({ data: [row(1, { actor_role: 'root' })], error: null });

    await expect(new SupabaseAuditLogReader(client).search({}, { limit: 5, after: null })).rejects.toThrow(
      /Rôle d'auteur invalide/,
    );
  });

  it('propage l’erreur de la base', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });

    await expect(new SupabaseAuditLogReader(client).search({}, { limit: 5, after: null })).rejects.toThrow('boom');
  });
});
