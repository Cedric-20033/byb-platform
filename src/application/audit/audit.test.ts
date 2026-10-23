// src/application/audit/audit.test.ts
import { describe, expect, it } from 'vitest';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { InMemoryAuditLogReader } from '@/test/fakes/InMemoryAuditLogReader';
import { buildAuditLogEntry } from '@/test/fixtures/buildAuditLogEntry';
import { ExportAuditLogs, MAX_AUDIT_EXPORT_ROWS } from './ExportAuditLogs';
import { DEFAULT_AUDIT_PAGE_SIZE, ListAuditLogs, MAX_AUDIT_PAGE_SIZE, toSearchCriteria } from './ListAuditLogs';
import { RecordAuthEvent, type AuthEvent } from './RecordAuthEvent';

/** `count` entrées d'instants distincts, de rang 1 (la plus ancienne) à `count` (la plus récente). */
const entries = (count: number) => Array.from({ length: count }, (_, index) => buildAuditLogEntry(index + 1));

describe('toSearchCriteria — jours calendaires belges → instants', () => {
  it('été (UTC+2) : « du 5 au 7 octobre » couvre de minuit à minuit heure de Bruxelles', () => {
    const criteria = toSearchCriteria({ dateFrom: '2026-10-05', dateTo: '2026-10-07' });

    expect(criteria.occurredFrom).toBe('2026-10-04T22:00:00.000Z');
    // Borne haute = minuit SUIVANT, exclu : un événement de 23 h 30 le 7 octobre reste inclus.
    expect(criteria.occurredBefore).toBe('2026-10-07T22:00:00.000Z');
  });

  it('hiver (UTC+1)', () => {
    const criteria = toSearchCriteria({ dateFrom: '2026-11-02', dateTo: '2026-11-02' });

    expect(criteria.occurredFrom).toBe('2026-11-01T23:00:00.000Z');
    expect(criteria.occurredBefore).toBe('2026-11-02T23:00:00.000Z');
  });

  it('jour du retour à l\'heure d\'hiver (25 octobre 2026) : la journée dure 25 heures', () => {
    const criteria = toSearchCriteria({ dateFrom: '2026-10-25', dateTo: '2026-10-25' });

    expect(criteria.occurredFrom).toBe('2026-10-24T22:00:00.000Z'); // minuit en UTC+2
    expect(criteria.occurredBefore).toBe('2026-10-25T23:00:00.000Z'); // minuit suivant en UTC+1
  });

  it('sans période, aucune borne ; les autres critères passent tels quels', () => {
    expect(toSearchCriteria({ action: 'SLOT_BLOCKED', actorRole: ActorRole.ADMIN })).toEqual({
      action: 'SLOT_BLOCKED',
      actorRole: ActorRole.ADMIN,
      occurredFrom: undefined,
      occurredBefore: undefined,
    });
    expect(toSearchCriteria()).toEqual({ occurredFrom: undefined, occurredBefore: undefined });
  });
});

describe('ListAuditLogs', () => {
  it('liste du plus récent au plus ancien', async () => {
    const page = await new ListAuditLogs(new InMemoryAuditLogReader(entries(3))).execute();

    expect(page.entries.map((entry) => entry.createdAt)).toEqual(
      [...page.entries.map((entry) => entry.createdAt)].sort().reverse(),
    );
    expect(page.entries[0].id).toBe(buildAuditLogEntry(3).id);
  });

  it('pagine sans trou ni doublon, même quand plusieurs lignes partagent le même instant', async () => {
    const sameInstant = '2026-10-06T12:00:00.000Z';
    const all = [
      ...entries(4),
      // Quatre lignes à la même milliseconde : seul l'identifiant les départage.
      ...[10, 11, 12, 13].map((n) => buildAuditLogEntry(n, { createdAt: sameInstant })),
    ];
    const useCase = new ListAuditLogs(new InMemoryAuditLogReader(all));

    const seen: string[] = [];
    let cursor = null;
    let pages = 0;
    do {
      const page: Awaited<ReturnType<ListAuditLogs['execute']>> = await useCase.execute({ cursor, limit: 3 });
      seen.push(...page.entries.map((entry) => entry.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor);

    expect(pages).toBe(3);
    expect(new Set(seen).size).toBe(all.length);
    expect(seen).toHaveLength(all.length);
  });

  it('borne la taille de page : plafond, plancher et valeur par défaut', async () => {
    const useCase = new ListAuditLogs(new InMemoryAuditLogReader(entries(150)));

    expect((await useCase.execute({ limit: 10_000 })).entries).toHaveLength(MAX_AUDIT_PAGE_SIZE);
    expect((await useCase.execute({ limit: 0 })).entries).toHaveLength(1);
    expect((await useCase.execute({ limit: -5 })).entries).toHaveLength(1);
    expect((await useCase.execute({ limit: Number.NaN })).entries).toHaveLength(DEFAULT_AUDIT_PAGE_SIZE);
    expect((await useCase.execute()).entries).toHaveLength(DEFAULT_AUDIT_PAGE_SIZE);
  });

  it('filtre par acteur, rôle, action, cible et période', async () => {
    const all = [
      buildAuditLogEntry(1, { actorId: 'a', actorRole: ActorRole.ADMIN, action: AuditAction.SLOT_BLOCKED }),
      buildAuditLogEntry(2, { actorId: 'b', actorRole: ActorRole.SUPERADMIN, action: AuditAction.USER_INVITED, targetType: 'user', targetId: 'u-1' }),
      buildAuditLogEntry(3, { actorRole: ActorRole.CLIENT, action: AuditAction.APPOINTMENT_CREATED, targetType: 'appointment' }),
      buildAuditLogEntry(4, { createdAt: '2026-10-08T09:00:00.000Z' }),
    ];
    const useCase = new ListAuditLogs(new InMemoryAuditLogReader(all));
    const ids = async (filters: Parameters<ListAuditLogs['execute']>[0]) =>
      (await useCase.execute(filters)).entries.map((entry) => entry.id);

    expect(await ids({ filters: { actorId: 'a' } })).toEqual([all[0].id]);
    expect(await ids({ filters: { actorRole: ActorRole.CLIENT } })).toEqual([all[2].id]);
    expect(await ids({ filters: { action: AuditAction.USER_INVITED } })).toEqual([all[1].id]);
    expect(await ids({ filters: { targetType: 'user', targetId: 'u-1' } })).toEqual([all[1].id]);
    // Les trois premières entrées sont du 6 octobre, la dernière du 8.
    expect(await ids({ filters: { dateFrom: '2026-10-07' } })).toEqual([all[3].id]);
    expect(await ids({ filters: { dateTo: '2026-10-06' } })).toEqual([all[2].id, all[1].id, all[0].id]);
  });
});

describe('ExportAuditLogs', () => {
  const actor = { actorId: 'super-1', actorRole: ActorRole.SUPERADMIN };

  it('rassemble toutes les pages et trace l\'export lui-même', async () => {
    const reader = new InMemoryAuditLogReader(entries(250));
    const audit = new FakeAuditLogger();

    const result = await new ExportAuditLogs(reader, audit).execute({ ...actor, filters: { actorRole: ActorRole.ADMIN } });

    expect(result.entries).toHaveLength(250);
    expect(result.truncated).toBe(false);
    expect(reader.searchCalls).toBe(3); // 100 + 100 + 50 : l'export pagine, il ne lit pas tout d'un coup
    expect(audit.entries).toEqual([
      {
        ...actor,
        action: AuditAction.EXPORT_GENERATED,
        targetType: 'audit_log',
        targetId: null,
        metadata: { count: 250, truncated: false, filters: { actorRole: ActorRole.ADMIN } },
      },
    ]);
  });

  it('plafonne l\'export et le signale (les plus anciennes lignes sont écartées)', async () => {
    const all = entries(MAX_AUDIT_EXPORT_ROWS + 100);
    const audit = new FakeAuditLogger();

    const result = await new ExportAuditLogs(new InMemoryAuditLogReader(all), audit).execute(actor);

    expect(result.entries).toHaveLength(MAX_AUDIT_EXPORT_ROWS);
    expect(result.truncated).toBe(true);
    expect(result.entries[0].id).toBe(all.at(-1)?.id); // la plus récente en tête
    expect(audit.entries[0].metadata).toMatchObject({ count: MAX_AUDIT_EXPORT_ROWS, truncated: true });
  });

  it('un journal de taille exactement égale au plafond n\'est pas déclaré tronqué', async () => {
    const result = await new ExportAuditLogs(
      new InMemoryAuditLogReader(entries(MAX_AUDIT_EXPORT_ROWS)),
      new FakeAuditLogger(),
    ).execute(actor);

    expect(result.entries).toHaveLength(MAX_AUDIT_EXPORT_ROWS);
    expect(result.truncated).toBe(false);
  });

  it('trace un export vide', async () => {
    const audit = new FakeAuditLogger();
    const result = await new ExportAuditLogs(new InMemoryAuditLogReader([]), audit).execute(actor);

    expect(result).toEqual({ entries: [], truncated: false });
    expect(audit.entries[0].metadata).toMatchObject({ count: 0 });
  });
});

describe('RecordAuthEvent', () => {
  it.each<[AuthEvent, AuditAction]>([
    ['login', AuditAction.AUTH_LOGIN],
    ['logout', AuditAction.AUTH_LOGOUT],
    ['login_failed', AuditAction.AUTH_LOGIN_FAILED],
    ['password_changed', AuditAction.AUTH_PASSWORD_CHANGED],
  ])('« %s » est tracé comme %s, avec le compte pour cible', async (event, action) => {
    const audit = new FakeAuditLogger();

    await new RecordAuthEvent(audit).execute({ event, actorId: 'admin-1', actorRole: ActorRole.ADMIN });

    expect(audit.entries).toEqual([
      { actorId: 'admin-1', actorRole: ActorRole.ADMIN, action, targetType: 'auth', targetId: 'admin-1', metadata: undefined },
    ]);
  });

  it('un échec de connexion sans identité établie n\'a ni auteur ni cible, mais garde ses métadonnées', async () => {
    const audit = new FakeAuditLogger();

    await new RecordAuthEvent(audit).execute({
      event: 'login_failed',
      actorId: null,
      actorRole: ActorRole.CLIENT,
      metadata: { email: 'inconnu@example.com', reason: 'invalid_credentials' },
    });

    expect(audit.entries[0]).toMatchObject({
      actorId: null,
      targetId: null,
      actorRole: ActorRole.CLIENT,
      metadata: { email: 'inconnu@example.com', reason: 'invalid_credentials' },
    });
  });
});
