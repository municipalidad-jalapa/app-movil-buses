import type { Posicion } from './tipos';

/**
 * Proyecta coordenadas geograficas al lienzo del mapa.
 *
 * El mock de `design/MapaJalapa.dc.html` dibuja sobre un viewBox de 390x640, y
 * el overlay de la ruta esta hecho a esa medida. Para que el mismo dibujo sirva
 * con datos reales hace falta llevar lat/lon a ese lienzo.
 *
 * Es una proyeccion plana, no Mercator: a la escala de una ruta urbana de pocos
 * kilometros la diferencia es de metros, y a cambio no arrastra dependencias ni
 * complica el codigo. Si algun dia el mapa cubre toda Jalapa habra que revisarlo.
 */

export const ANCHO_LIENZO = 390;
export const ALTO_LIENZO = 640;

/** Margen para que las paradas de los extremos no queden pegadas al borde. */
const MARGEN = 56;

export interface PuntoGeografico {
  latitud: number;
  longitud: number;
}

export interface PuntoLienzo {
  x: number;
  y: number;
}

export interface Proyeccion {
  proyectar: (punto: PuntoGeografico) => PuntoLienzo;
}

/**
 * Arma la proyeccion que encuadra todos los puntos dados.
 *
 * <p>Se calcula una sola vez con las paradas de la ruta y NO se recalcula cuando
 * llega una posicion nueva del bus: si el encuadre cambiara con cada evento, el
 * mapa entero saltaria bajo el marcador y seria imposible de seguir.
 */
export function crearProyeccion(puntos: readonly PuntoGeografico[]): Proyeccion {
  if (puntos.length === 0) {
    // Sin paradas no hay nada que encuadrar; se centra todo.
    return { proyectar: () => ({ x: ANCHO_LIENZO / 2, y: ALTO_LIENZO / 2 }) };
  }

  const latitudes = puntos.map((p) => p.latitud);
  const longitudes = puntos.map((p) => p.longitud);

  const latMin = Math.min(...latitudes);
  const latMax = Math.max(...latitudes);
  const lonMin = Math.min(...longitudes);
  const lonMax = Math.max(...longitudes);

  // Una ruta casi recta deja un rango de cero en un eje: sin este piso la
  // division seria por cero y todo colapsaria a un punto.
  const anchoGeo = Math.max(lonMax - lonMin, 1e-6);
  const altoGeo = Math.max(latMax - latMin, 1e-6);

  const anchoUtil = ANCHO_LIENZO - MARGEN * 2;
  const altoUtil = ALTO_LIENZO - MARGEN * 2;

  // Una sola escala para los dos ejes: con escalas distintas la ruta se
  // deformaria y dejaria de parecerse al recorrido real.
  const escala = Math.min(anchoUtil / anchoGeo, altoUtil / altoGeo);

  const centroLon = (lonMin + lonMax) / 2;
  const centroLat = (latMin + latMax) / 2;

  return {
    proyectar: ({ latitud, longitud }) => ({
      x: ANCHO_LIENZO / 2 + (longitud - centroLon) * escala,
      // La latitud crece hacia el norte y la Y del SVG hacia abajo: se invierte.
      y: ALTO_LIENZO / 2 - (latitud - centroLat) * escala,
    }),
  };
}

/** Convierte una lista de puntos en el atributo `d` de un `<path>`. */
export function trazoDe(puntos: readonly PuntoLienzo[]): string {
  if (puntos.length === 0) return '';
  return puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${redondear(p.x)} ${redondear(p.y)}`).join(' ');
}

/** Dos decimales bastan a esta escala y mantienen el SVG legible. */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Una posicion del bus vale para proyectar igual que una parada. */
export function comoPuntoGeografico(posicion: Posicion): PuntoGeografico {
  return { latitud: posicion.latitud, longitud: posicion.longitud };
}
