// src/domain/holiday/Holiday.ts

/**
 * Entité métier : un jour férié ou congé bloquant la prise de rendez-vous.
 */
export class Holiday {
  constructor(
    public readonly id: string,
    public readonly date: string, // format ISO "YYYY-MM-DD"
    public readonly label: string,
    public readonly isRecurring: boolean, // ex: le 25 décembre, chaque année
  ) {}

  /**
   * Détermine si ce jour férié s'applique à une date donnée.
   * Un jour récurrent (ex: Noël) ne compare que mois+jour, peu importe l'année.
   */
  appliesTo(targetDate: string): boolean {
    if (this.isRecurring) {
      return this.date.slice(5) === targetDate.slice(5); // compare "MM-DD"
    }
    return this.date === targetDate;
  }
}
