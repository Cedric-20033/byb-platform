// src/domain/shared/TimeRange.ts

/**
 * Value Object représentant une plage horaire (ex: 09:00 → 10:00).
 * Immuable : toute logique de comparaison passe par les méthodes de cette classe,
 * jamais par un accès direct et une comparaison manuelle des champs ailleurs dans le code.
 */
export class TimeRange {
  constructor(
    public readonly startTime: string, // format "HH:mm"
    public readonly endTime: string,
  ) {
    if (startTime >= endTime) {
      throw new Error("L'heure de début doit précéder l'heure de fin.");
    }
  }

  /**
   * Détecte un chevauchement avec une autre plage horaire.
   * Règle centrale de l'anti-double-réservation au niveau domaine.
   */
  overlaps(other: TimeRange): boolean {
    return this.startTime < other.endTime && other.startTime < this.endTime;
  }
}
