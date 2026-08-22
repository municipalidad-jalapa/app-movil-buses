import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MapaRuta, obtenerCoordenadasRuta, TEXTO_ATRIBUCION_OSM } from './MapaRuta';
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

describe('atribución del mapa', () => {
  it('muestra una píldora permanente que no puede colapsarse', () => {
    const html = renderToStaticMarkup(<MapaRuta />);

    expect(html).toContain('mapa-ruta__atribucion');
    expect(html).toContain(TEXTO_ATRIBUCION_OSM);
  });
});