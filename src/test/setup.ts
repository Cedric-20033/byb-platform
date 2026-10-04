// src/test/setup.ts
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Démonte les composants rendus entre deux tests (uniquement en environnement jsdom).
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});
