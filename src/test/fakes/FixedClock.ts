// src/test/fakes/FixedClock.ts
import type { Clock } from '@/domain/shared/Clock';

/** Horloge figée, pour tester les règles dépendant de "maintenant" de façon déterministe. */
export class FixedClock implements Clock {
  constructor(private current: Date) {}

  /** Raccourci : `FixedClock.at('2026-10-01T00:30:00+02:00')`. */
  static at(iso: string): FixedClock {
    return new FixedClock(new Date(iso));
  }

  now(): Date {
    return this.current;
  }

  set(iso: string): void {
    this.current = new Date(iso);
  }
}
