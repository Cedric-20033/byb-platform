// src/lib/booking/resolveBookingPreselection.test.ts
import { describe, expect, it } from 'vitest';
import { buildService, buildSubService } from '@/test/fixtures/catalog';
import { resolveBookingPreselection } from './resolveBookingPreselection';

const toiture = buildService('toiture', [buildSubService('plate'), buildSubService('pentue')]);
const bardage = buildService('bardage', [buildSubService('plate')]);
const services = [toiture, bardage];

describe('resolveBookingPreselection', () => {
  it('ne présélectionne rien sans paramètre', () => {
    expect(resolveBookingPreselection(services, undefined, undefined)).toEqual({
      service: null,
      subService: null,
    });
  });

  it('retrouve le service par son slug', () => {
    expect(resolveBookingPreselection(services, 'bardage', undefined)).toEqual({
      service: bardage,
      subService: null,
    });
  });

  it('retrouve la sous-prestation au sein du service demandé', () => {
    const result = resolveBookingPreselection(services, 'toiture', 'pentue');

    expect(result.service).toBe(toiture);
    expect(result.subService?.id).toBe('sub-pentue');
  });

  it('résout une sous-prestation homonyme dans le bon service', () => {
    const result = resolveBookingPreselection(services, 'bardage', 'plate');

    expect(result.subService).toBe(bardage.subServices[0]);
  });

  it('ignore un slug de service inconnu', () => {
    expect(resolveBookingPreselection(services, 'inconnu', 'plate')).toEqual({
      service: null,
      subService: null,
    });
  });

  it('ignore une sous-prestation sans service valide', () => {
    expect(resolveBookingPreselection(services, undefined, 'plate').subService).toBeNull();
  });

  it('conserve le service quand la sous-prestation est inconnue', () => {
    const result = resolveBookingPreselection(services, 'toiture', 'inexistante');

    expect(result.service).toBe(toiture);
    expect(result.subService).toBeNull();
  });

  it('retient la première valeur quand le paramètre est répété', () => {
    expect(resolveBookingPreselection(services, ['bardage', 'toiture'], undefined).service).toBe(bardage);
  });

  it('traite une valeur vide ou faite d\'espaces comme absente', () => {
    expect(resolveBookingPreselection(services, '  ', undefined).service).toBeNull();
    expect(resolveBookingPreselection(services, [], undefined).service).toBeNull();
  });

  it('est sensible à la casse (les slugs sont en minuscules)', () => {
    expect(resolveBookingPreselection(services, 'Toiture', undefined).service).toBeNull();
  });
});
