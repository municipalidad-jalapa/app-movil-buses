import { describe, expect, it } from 'vitest';
import {
  interpolarPunto,
  progresoAnimacion,
  rumboEntre,
} from './interpolacionPosicion';

const jalapa = { latitud: 14.6335, longitud: -89.9885 };

describe('interpolarPunto', () => {
  it('en t=0 queda en el origen', () => {
    const destino = { latitud: 14.64, longitud: -89.98 };
    expect(interpolarPunto(jalapa, destino, 0)).toEqual(jalapa);
  });

  it('en t=1 queda en el destino', () => {
    const destino = { latitud: 14.64, longitud: -89.98 };
    expect(interpolarPunto(jalapa, destino, 1)).toEqual(destino);
  });

  it('en t=0.5 queda a mitad de camino', () => {
    const destino = { latitud: 14.6435, longitud: -89.9785 };
    const mitad = interpolarPunto(jalapa, destino, 0.5);
    expect(mitad.latitud).toBeCloseTo(14.6385);
    expect(mitad.longitud).toBeCloseTo(-89.9835);
  });

  it('acota un progreso fuera de 0–1', () => {
    const destino = { latitud: 15, longitud: -89 };
    expect(interpolarPunto(jalapa, destino, -1)).toEqual(jalapa);
    expect(interpolarPunto(jalapa, destino, 2)).toEqual(destino);
  });
});

describe('rumboEntre', () => {
  it('hacia el norte queda cerca de 0°', () => {
    const norte = { latitud: 14.6435, longitud: -89.9885 };
    expect(rumboEntre(jalapa, norte)).toBeCloseTo(0, 0);
  });

  it('hacia el este queda cerca de 90°', () => {
    const este = { latitud: 14.6335, longitud: -89.9785 };
    expect(rumboEntre(jalapa, este)).toBeCloseTo(90, 0);
  });

  it('si el punto no cambia, el rumbo es 0', () => {
    expect(rumboEntre(jalapa, jalapa)).toBe(0);
  });
});

describe('progresoAnimacion', () => {
  it('con movimiento reducido salta al final', () => {
    expect(progresoAnimacion(100, 0, 1000, true)).toBe(1);
  });

  it('avanza lineal entre inicio y duracion', () => {
    expect(progresoAnimacion(250, 0, 1000, false)).toBe(0.25);
  });

  it('no se pasa de 1', () => {
    expect(progresoAnimacion(2000, 0, 1000, false)).toBe(1);
  });
});
