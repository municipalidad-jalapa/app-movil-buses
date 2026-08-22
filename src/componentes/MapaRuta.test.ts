import { describe, expect, it } from 'vitest';
import { obtenerCoordenadasRuta, obtenerLimitesParadas } from './MapaRuta';
import type { Parada } from '../core/tipos';

const parada = (orden: number, latitud: number, longitud: number): Parada => ({
  id: orden,
  nombre: `Parada ${orden}`,
  latitud,
  longitud,
  orden,
});

describe('obtenerCoordenadasRuta', () => {
  it('ordena las paradas y conserva latitud y longitud para el mapa', () => {
    expect(obtenerCoordenadasRuta([
      parada(2, 14.64, -89.98),
      parada(1, 14.63, -89.99),
    ])).toEqual([
      { latitud: 14.63, longitud: -89.99 },
      { latitud: 14.64, longitud: -89.98 },
    ]);
  });

  it('descarta coordenadas invalidas para no romper el trazado', () => {
    expect(obtenerCoordenadasRuta([
      parada(1, 14.63, -89.99),
      parada(2, Number.NaN, -89.98),
      parada(3, 14.64, Number.POSITIVE_INFINITY),
    ])).toEqual([{ latitud: 14.63, longitud: -89.99 }]);
  });
});

describe('obtenerLimitesParadas', () => {
  it('calcula los limites usando solo paradas con coordenadas validas', () => {
    expect(obtenerLimitesParadas([
      parada(2, 14.64, -89.98),
      parada(1, 14.63, -89.99),
      parada(3, Number.NaN, -89.97),
    ])).toEqual([
      [-89.99, 14.63],
      [-89.98, 14.64],
    ]);
  });

  it('no devuelve limites cuando no hay coordenadas validas', () => {
    expect(obtenerLimitesParadas([parada(1, Number.NaN, -89.99)])).toBeUndefined();
  });
});