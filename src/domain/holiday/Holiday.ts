// src/domain/holiday/Holiday.ts

/**
 * Entité métier : un jour férié ou un congé (un jour, ou une plage de jours) bloquant la prise de rendez-vous.
 */
export class Holiday {
  constructor(
    public readonly id: string,
    public readonly date: string, // premier jour, format ISO "YYYY-MM-DD"
    public readonly label: string,
    public readonly isRecurring: boolean, // ex: le 25 décembre, chaque année
    /** Dernier jour INCLUS ; égal à `date` pour un jour unique. */
    public readonly endDate: string = date,
  ) {}

  isRange(): boolean {
    return this.endDate !== this.date;
  }

  /**
   * Détermine si ce jour férié ou ce congé s'applique à une date donnée.
   * Un congé récurrent (ex: Noël, ou une fermeture annuelle du 1er au 15 août) ne compare que mois+jour,
   * peu importe l'année. Une plage récurrente ne chevauche jamais deux années (contrainte de base),
   * ce qui rend la comparaison "MM-DD" entre bornes exacte.
   */
  appliesTo(targetDate: string): boolean {
    if (this.isRecurring) {
      const monthDay = targetDate.slice(5);
      return monthDay >= this.date.slice(5) && monthDay <= this.endDate.slice(5);
    }
    return targetDate >= this.date && targetDate <= this.endDate;
  }
}
