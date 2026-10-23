// src/domain/holiday/Holiday.test.ts
import { describe, expect, it } from 'vitest';
import { Holiday } from './Holiday';

describe('Holiday', () => {
  describe('jour unique', () => {
    it('s\'applique à sa date uniquement', () => {
      const holiday = new Holiday('h', '2026-05-14', 'Ascension', false);

      expect(holiday.appliesTo('2026-05-14')).toBe(true);
      expect(holiday.appliesTo('2026-05-13')).toBe(false);
      expect(holiday.appliesTo('2027-05-14')).toBe(false);
    });

    it('prend sa date de début comme date de fin par défaut', () => {
      const holiday = new Holiday('h', '2026-05-14', 'Ascension', false);

      expect(holiday.endDate).toBe('2026-05-14');
      expect(holiday.isRange()).toBe(false);
    });
  });

  describe('plage de congés', () => {
    const holiday = new Holiday('h', '2026-08-03', 'Congés annuels', false, '2026-08-14');

    it('s\'applique à chaque jour de la plage, bornes incluses', () => {
      for (const date of ['2026-08-03', '2026-08-09', '2026-08-14']) {
        expect(holiday.appliesTo(date), date).toBe(true);
      }
    });

    it('ne s\'applique pas à la veille, au lendemain ni à une autre année', () => {
      for (const date of ['2026-08-02', '2026-08-15', '2027-08-05']) {
        expect(holiday.appliesTo(date), date).toBe(false);
      }
    });

    it('se reconnaît comme une plage', () => {
      expect(holiday.isRange()).toBe(true);
    });

    it('traverse un changement de mois', () => {
      const overMonth = new Holiday('h', '2026-07-28', 'Chantier fermé', false, '2026-08-04');

      expect(overMonth.appliesTo('2026-07-31')).toBe(true);
      expect(overMonth.appliesTo('2026-08-01')).toBe(true);
    });
  });

  describe('récurrence annuelle', () => {
    it('applique un jour récurrent chaque année', () => {
      const christmas = new Holiday('h', '2020-12-25', 'Noël', true);

      expect(christmas.appliesTo('2031-12-25')).toBe(true);
      expect(christmas.appliesTo('2031-12-24')).toBe(false);
    });

    it('applique une plage récurrente aux mêmes mois et jours chaque année', () => {
      const closure = new Holiday('h', '2020-08-01', 'Fermeture annuelle', true, '2020-08-15');

      expect(closure.appliesTo('2026-08-01')).toBe(true);
      expect(closure.appliesTo('2031-08-15')).toBe(true);
      expect(closure.appliesTo('2026-08-16')).toBe(false);
      expect(closure.appliesTo('2026-07-31')).toBe(false);
    });
  });
});
