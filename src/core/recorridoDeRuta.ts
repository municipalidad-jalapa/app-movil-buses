import type { Punto, Ruta } from './tipos';

/**
 * Los puntos con los que se dibuja la linea de una ruta.
 *
 * El trazado sigue las calles; las paradas unidas dan una recta que atraviesa
 * manzanas. Se usa el trazado siempre que exista, y las paradas solo como
 * respaldo: una ruta a la que aun no se le ha cargado el trazado (SCRUM-136)
 * tiene que poder dibujarse igual, aunque salga peor.
 *
 * Vive fuera del componente del mapa para poder probarse sin WebGL.
 */
export function recorridoDeRuta(ruta: Ruta | null): Punto[] {
  if (!ruta) return [];
  // Un solo punto no es una linea: con el trazado a medias, las paradas dan mas.
  if (ruta.trazado && ruta.trazado.length > 1) return ruta.trazado;
  return ruta.paradas.map((p) => ({ latitud: p.latitud, longitud: p.longitud }));
}
