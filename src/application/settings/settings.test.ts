// src/application/settings/settings.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { InMemoryCompanySettingsRepository } from '@/test/fakes/InMemoryCompanySettingsRepository';
import { settingsWith, validSettings } from '@/test/fixtures/companySettings';
import { GetCompanySettings } from './GetCompanySettings';
import { UpdateCompanySettings } from './UpdateCompanySettings';

const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };
/** Valeurs de repli : celles du site avant tout enregistrement. */
const fallback = settingsWith({ phone: '+32 000 00 00 00' });

let repository: InMemoryCompanySettingsRepository;
let audit: FakeAuditLogger;

beforeEach(() => {
  repository = new InMemoryCompanySettingsRepository();
  audit = new FakeAuditLogger();
});

const update = (settings = validSettings()) =>
  new UpdateCompanySettings(repository, audit, fallback).execute({ ...actor, settings });

describe('GetCompanySettings', () => {
  it('renvoie les valeurs de repli tant que rien n\'est enregistré', async () => {
    expect(await new GetCompanySettings(repository, fallback).execute()).toEqual(fallback);
  });

  it('renvoie les réglages enregistrés dès qu\'ils existent', async () => {
    await update(settingsWith({ phone: '+32 111 11 11 11' }));

    const result = await new GetCompanySettings(repository, fallback).execute();

    expect(result.phone).toBe('+32 111 11 11 11');
  });
});

describe('UpdateCompanySettings', () => {
  it('enregistre les réglages normalisés', async () => {
    const saved = await update(settingsWith({ email: '  Contact@BYB.test ' }));

    expect(saved.email).toBe('contact@byb.test');
    expect(repository.stored?.email).toBe('contact@byb.test');
  });

  it('trace la modification avec les champs changés, sans leur contenu', async () => {
    await update(settingsWith({ phone: '+32 111 11 11 11' }));

    expect(audit.entries).toEqual([
      {
        ...actor,
        action: AuditAction.SETTINGS_UPDATED,
        targetType: 'settings',
        targetId: null,
        metadata: { changedFields: ['phone'] },
      },
    ]);
    expect(JSON.stringify(audit.entries)).not.toContain('+32 111 11 11 11');
  });

  it('compare au repli au premier enregistrement', async () => {
    // Identique au repli : la ligne est créée, mais aucune modification n'est à tracer.
    await update(fallback);

    expect(repository.saveCount).toBe(1);
    expect(audit.entries).toHaveLength(0);
  });

  it('ne réécrit ni ne trace rien quand rien ne change', async () => {
    await update();
    audit.entries.length = 0;

    await update();

    expect(repository.saveCount).toBe(1);
    expect(audit.entries).toHaveLength(0);
  });

  it('trace un changement de paramètre de réservation', async () => {
    await update();
    audit.entries.length = 0;

    await update(settingsWith({ booking: { ...validSettings().booking, confirmationMode: 'auto' } }));

    expect(audit.entries[0].metadata).toEqual({ changedFields: ['booking.confirmationMode'] });
  });

  it('refuse des réglages invalides sans rien écrire ni tracer', async () => {
    await expect(update(settingsWith({ sites: [] }))).rejects.toMatchObject({ code: 'SETTINGS_INVALID' });

    expect(repository.saveCount).toBe(0);
    expect(audit.entries).toHaveLength(0);
  });
});
