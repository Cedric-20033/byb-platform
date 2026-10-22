// vitest.config.ts
import { configDefaults, defineConfig } from 'vitest/config';
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
    // Les tests d'intégration exigent une vraie base : lancés à part (`npm run test:integration`), jamais ignorés en silence.
    exclude: [...configDefaults.exclude, 'src/**/*.integration.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Le nombre de cœurs exposé à Vitest dans certains environnements dépasse largement
    // les ressources disponibles et provoque des timeouts dans les tests de composants.
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domain/**', 'src/application/**', 'src/lib/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
      // Objectifs de la feuille de route (P10.1) : `npm run test:coverage` échoue sous ces seuils.
      // Le noyau métier est exigeant (90 %) ; le seuil global (70 %) couvre aussi `src/lib/`.
      // Les composants React sont validés par les tests de composant et l'E2E, hors de ce périmètre.
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 70,
        'src/domain/**': { lines: 90, functions: 90, statements: 90, branches: 80 },
        'src/application/**': { lines: 90, functions: 90, statements: 90, branches: 80 },
      },
    },
  },
});
