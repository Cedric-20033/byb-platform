// src/infrastructure/email/DeferredEmailProvider.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailType, type EmailPayload, type EmailProvider } from '@/domain/shared/EmailProvider';
import { DeferredEmailProvider } from './DeferredEmailProvider';

// `after()` n'existe qu'au cœur d'une requête Next : on le remplace par une file que le test vide à la main.
const { scheduled } = vi.hoisted(() => ({ scheduled: [] as Array<() => unknown> }));
vi.mock('next/server', () => ({
  after: (task: () => unknown) => {
    scheduled.push(task);
  },
}));

const payload: EmailPayload = { to: 'client@example.com', type: EmailType.APPOINTMENT_CONFIRMATION, data: {} };

describe('DeferredEmailProvider', () => {
  beforeEach(() => {
    scheduled.length = 0;
  });

  it('n\'envoie rien tout de suite : l\'envoi est planifié après la réponse', async () => {
    const inner: EmailProvider = { send: vi.fn().mockResolvedValue(undefined) };

    await new DeferredEmailProvider(inner).send(payload);

    expect(inner.send).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
  });

  it('transmet le message tel quel au fournisseur quand la tâche planifiée s\'exécute', async () => {
    const inner: EmailProvider = { send: vi.fn().mockResolvedValue(undefined) };

    await new DeferredEmailProvider(inner).send(payload);
    await scheduled[0]();

    expect(inner.send).toHaveBeenCalledExactlyOnceWith(payload);
  });

  it('ne fait pas attendre l\'appelant, même si le fournisseur ne répond jamais', async () => {
    const inner: EmailProvider = { send: vi.fn().mockReturnValue(new Promise<void>(() => {})) };

    await expect(new DeferredEmailProvider(inner).send(payload)).resolves.toBeUndefined();
  });
});
