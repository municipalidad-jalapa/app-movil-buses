import { describe, expect, it } from 'vitest';
import { recorridoDeRuta } from './recorridoDeRuta';
import type { Ruta } from './tipos';

const paradas = [
  { id: 1, nombre: 'A', latitud: 14.63, longitud: -89.98, orden: 1 },
  { id: 2, nombre: 'B', latitud: 14.64, longitud: -89.99, orden: 2 },
];

const ruta = (trazado: Ruta['trazado']): Ruta => ({
  id: 1, nombre: 'Ruta', activa: true, paradas, trazado,
});

describe('recorridoDeRuta', () => {
  it('prefiere el trazado, que es el que sigue las calles', () => {
    const trazado = [
      { latitud: 14.63, longitud: -89.98 },
      { latitud: 14.635, longitud: -89.985 },
      { latitud: 14.64, longitud: -89.99 },
    ];
    expect(recorridoDeRuta(ruta(trazado))).toEqual(trazado);
  });

  it('cae a las paradas cuando la ruta aun no tiene trazado cargado', () => {
    expect(recorridoDeRuta(ruta([]))).toEqual([
      { latitud: 14.63, longitud: -89.98 },
      { latitud: 14.64, longitud: -89.99 },
    ]);
  });

  it('ignora un trazado de un solo punto: no dibuja una linea', () => {
    expect(recorridoDeRuta(ruta([{ latitud: 14.63, longitud: -89.98 }]))).toHaveLength(2);
  });

  it('sin ruta no hay nada que dibujar', () => {
    expect(recorridoDeRuta(null)).toEqual([]);
  });
});
