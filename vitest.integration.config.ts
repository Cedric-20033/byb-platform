// vitest.integration.config.ts
//
// Tests d'intégration : les vrais repositories Supabase contre une VRAIE base (locale ou de test).
// Séparés de `npm test` plutôt que « ignorés quand la base manque » : un test ignoré en silence ne prouve rien.
//   npm run test:integration   (variables : voir e2e/support/testData.ts)
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // Les scénarios partagent une base : on les déroule l'un après l'autre.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
