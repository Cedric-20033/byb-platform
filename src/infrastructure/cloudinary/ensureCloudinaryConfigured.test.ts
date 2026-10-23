// src/infrastructure/cloudinary/ensureCloudinaryConfigured.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { config } = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock('cloudinary', () => ({ v2: { config } }));

/** Le drapeau « déjà configuré » vit dans le module : on le recharge pour chaque cas. */
async function load() {
  vi.resetModules();
  return import('./ensureCloudinaryConfigured');
}

describe('ensureCloudinaryConfigured', () => {
  beforeEach(() => {
    config.mockClear();
    vi.unstubAllEnvs();
    vi.stubEnv('CLOUDINARY_API_KEY', 'key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'secret');
  });

  it('privilégie CLOUDINARY_CLOUD_NAME', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'serveur');
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'public');
    const { ensureCloudinaryConfigured } = await load();

    ensureCloudinaryConfigured();

    expect(config).toHaveBeenCalledWith(expect.objectContaining({ cloud_name: 'serveur', secure: true }));
  });

  it('se replie sur NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME quand la variable serveur est absente', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', undefined);
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'public');
    const { ensureCloudinaryConfigured } = await load();

    ensureCloudinaryConfigured();

    expect(config).toHaveBeenCalledWith(expect.objectContaining({ cloud_name: 'public' }));
  });

  it('ne configure le SDK qu\'une seule fois', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'serveur');
    const { ensureCloudinaryConfigured } = await load();

    ensureCloudinaryConfigured();
    ensureCloudinaryConfigured();

    expect(config).toHaveBeenCalledTimes(1);
  });
});
