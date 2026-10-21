// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // Même alias que tsconfig.json ("@/*" → "./src/*").
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Environnement Node par défaut (domain / application) ; un test de composant
    // passe en jsdom via `// @vitest-environment jsdom` en tête de fichier.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    // Le nombre de cœurs exposé à Vitest dans certains environnements dépasse largement
    // les ressources disponibles et provoque des timeouts dans les tests de composants.
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**', 'src/application/**', 'src/lib/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    },
  },
});
