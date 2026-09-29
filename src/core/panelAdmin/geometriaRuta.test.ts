import { describe, expect, it } from 'vitest';
import type { Ruta } from '../tipos';
import {
  continuar,
  largoEnMetros,
  lugarDeParada,
  paradasLejos,
  pasoDeRuta,
  proyectar,
  simplificar,
  textoLargo,
} from './geometriaRuta';

// Una recta de ~1 km hacia el este por la 1a Calle.
const A = { latitud: 14.63, longitud: -89.99 };
const B = { latitud: 14.63, longitud: -89.9807 };

describe('geometria del creador de rutas', () => {
  it('mide el recorrido y lo dice en km o m', () => {
    expect(largoEnMetros([A, B])).toBeGreaterThan(990);
    expect(largoEnMetros([A, B])).toBeLessThan(1010);
    expect(textoLargo(2640)).toBe('2,6 km');
    expect(textoLargo(350)).toBe('350 m');
  });

  it('una parada marcada cerca de la linea se pega a ella; lejos, queda donde se marco', () => {
    const cerca = { latitud: 14.6303, longitud: -89.985 };
    const pegada = lugarDeParada([A, B], cerca);
    expect(pegada.latitud).toBeCloseTo(14.63, 6);
    expect(pegada.longitud).toBeCloseTo(-89.985, 6);

    const lejos = { latitud: 14.632, longitud: -89.985 };
    expect(lugarDeParada([A, B], lejos)).toEqual(lejos);
    // Sin recorrido todavia, donde se marco.
    expect(lugarDeParada([], cerca)).toEqual(cerca);
  });

  it('sabe cuanto se recorrio hasta donde cae un punto', () => {
    const mitad = proyectar([A, B], { latitud: 14.63, longitud: -89.98535 });
    expect(mitad?.recorrido).toBeGreaterThan(480);
    expect(mitad?.recorrido).toBeLessThan(520);
  });

  it('un tramo nuevo sigue desde el final sin repetir el punto de union', () => {
    const tramo = [B, { latitud: 14.64, longitud: -89.9807 }];
    expect(continuar([A, B], tramo)).toEqual([A, B, tramo[1]]);
    expect(continuar([], tramo)).toEqual(tramo);
  });

  it('simplifica el temblor de la mano y conserva las esquinas', () => {
    const temblor = [A, { latitud: 14.63001, longitud: -89.985 }, B, { latitud: 14.64, longitud: -89.9807 }];
    expect(simplificar(temblor)).toEqual([A, B, temblor[3]]);
  });

  it('avisa las paradas que quedaron lejos del recorrido', () => {
    const paradas = [
      { nombre: 'Sobre la linea', latitud: 14.6301, longitud: -89.985 },
      { nombre: 'Lejos', latitud: 14.634, longitud: -89.985 },
    ];
    expect(paradasLejos([A, B], paradas).map((p) => p.nombre)).toEqual(['Lejos']);
  });

  it('dice en que paso va cada ruta', () => {
    const base: Ruta = { id: 1, nombre: 'X', activa: false, paradas: [], trazado: [] };
    const dosParadas = [
      { id: 1, nombre: 'a', latitud: 14.63, longitud: -89.99, orden: 1 },
      { id: 2, nombre: 'b', latitud: 14.63, longitud: -89.98, orden: 2 },
    ];
    expect(pasoDeRuta(base)).toBe('recorrido');
    expect(pasoDeRuta({ ...base, trazado: [A, B] })).toBe('paradas');
    expect(pasoDeRuta({ ...base, trazado: [A, B], paradas: dosParadas })).toBe('lista');
    expect(pasoDeRuta({ ...base, activa: true })).toBe('publicada');
  });
});
