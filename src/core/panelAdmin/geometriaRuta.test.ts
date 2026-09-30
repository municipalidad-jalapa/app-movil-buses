import { describe, expect, it } from 'vitest';
import type { Ruta } from '../tipos';
import {
  borrar,
  continuar,
  coser,
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
const LARGO = largoEnMetros([A, B]);
/** El punto de la recta A-B a tantos metros de A; `norte` lo corre hacia arriba. */
const aLos = (metros: number, norte = 0) => ({
  latitud: A.latitud + norte / 110_540,
  longitud: A.longitud + ((B.longitud - A.longitud) * metros) / LARGO,
});

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

  describe('el borrador', () => {
    it('si no toca el recorrido no cambia nada', () => {
      expect(borrar([A, B], [aLos(500, 80)], 20)).toBeNull();
      expect(borrar([], [A], 20)).toBeNull();
    });

    it('sobre el final lo recorta justo donde entra el borrador', () => {
      const borrado = borrar([A, B], [B], 100)!;
      expect(borrado.quedan).toHaveLength(1);
      const [pedazo] = borrado.quedan;
      expect(pedazo[0]).toEqual(A);
      expect(largoEnMetros(pedazo)).toBeCloseTo(LARGO - 100, 0);
      expect(borrado.borrados).toHaveLength(1);
      expect(borrado.borrados[0].at(-1)).toEqual(B);
    });

    it('en medio de una calle larga, sin vertices cerca, parte el recorrido en dos', () => {
      const borrado = borrar([A, B], [aLos(500)], 50)!;
      expect(borrado.quedan).toHaveLength(2);
      expect(largoEnMetros(borrado.quedan[0])).toBeCloseTo(450, 0);
      expect(largoEnMetros(borrado.quedan[1])).toBeCloseTo(LARGO - 550, 0);
      expect(largoEnMetros(borrado.borrados[0])).toBeCloseTo(100, 0);
    });

    it('un movimiento rapido que cruza la linea tambien borra', () => {
      // Dos muestras del puntero a 100 m de la linea, una a cada lado.
      const borrado = borrar([A, B], [aLos(500, 100), aLos(500, -100)], 20);
      expect(borrado?.quedan).toHaveLength(2);
    });

    it('lo que queda mas corto que el borrador es un resto y se va', () => {
      // El borrador deja 10 m sueltos al final: no se conservan.
      const borrado = borrar([A, B], [aLos(LARGO - 60)], 40)!;
      expect(borrado.quedan).toHaveLength(1);
      expect(largoEnMetros(borrado.quedan[0])).toBeCloseTo(LARGO - 100, 0);
    });

    it('pasado por todo el recorrido no deja nada', () => {
      expect(borrar([A, B], [A, B], 20)?.quedan).toEqual([]);
      expect(borrar([A], [A], 20)?.quedan).toEqual([]);
    });
  });

  describe('la costura despues de borrar en medio', () => {
    it('une los dos pedazos por el camino de las calles', () => {
      const antes = [A, aLos(450)];
      const despues = [aLos(550), B];
      const camino = [aLos(450), aLos(500, 40), aLos(550)];
      expect(coser(antes, camino, despues)).toEqual([A, aLos(450), aLos(500, 40), aLos(550), B]);
    });

    it('si el camino sale de un cruce que quedo atras, no hace ida y vuelta', () => {
      // El cruce mas cercano al corte esta 50 m antes, sobre lo que quedo.
      const antes = [A, aLos(450)];
      const despues = [aLos(550), B];
      const camino = [aLos(400), aLos(500, 40), aLos(600)];
      const cosido = coser(antes, camino, despues);
      expect(cosido.some((p) => Math.abs(p.longitud - aLos(450).longitud) < 1e-9)).toBe(false);
      expect(cosido.some((p) => Math.abs(p.longitud - aLos(550).longitud) < 1e-9)).toBe(false);
      expect(largoEnMetros(cosido)).toBeLessThan(LARGO + 30);
      expect(cosido[0]).toEqual(A);
      expect(cosido.at(-1)).toEqual(B);
    });
  });
});
