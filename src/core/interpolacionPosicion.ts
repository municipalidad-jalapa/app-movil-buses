/**
 * Interpolacion geografica del marcador (SCRUM-245).
 *
 * Pura a proposito: se prueba sin mapa ni React. El componente solo aplica
 * el resultado con transform / requestAnimationFrame.
 */

export interface PuntoGeografico {
  latitud: number;
  longitud: number;
}

/** Duracion del deslizamiento entre un evento y el siguiente. */
export const DURACION_DESLIZAMIENTO_MS = 1000;

export function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function interpolarPunto(
  origen: PuntoGeografico,
  destino: PuntoGeografico,
  progreso: number,
): PuntoGeografico {
  const t = acotar(progreso, 0, 1);
  return {
    latitud: origen.latitud + (destino.latitud - origen.latitud) * t,
    longitud: origen.longitud + (destino.longitud - origen.longitud) * t,
  };
}

/**
 * Rumbo inicial → destino en grados [0, 360). 0 es norte, 90 es este.
 * Si los puntos coinciden no hay direccion: se devuelve 0.
 */
export function rumboEntre(origen: PuntoGeografico, destino: PuntoGeografico): number {
  if (origen.latitud === destino.latitud && origen.longitud === destino.longitud) {
    return 0;
  }

  const phi1 = aRadianes(origen.latitud);
  const phi2 = aRadianes(destino.latitud);
  const deltaLambda = aRadianes(destino.longitud - origen.longitud);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  return (aGrados(Math.atan2(y, x)) + 360) % 360;
}

/** Con prefers-reduced-motion se salta al destino. */
export function progresoAnimacion(
  ahoraMs: number,
  inicioMs: number,
  duracionMs: number,
  reducirMovimiento: boolean,
): number {
  if (reducirMovimiento || duracionMs <= 0) return 1;
  return acotar((ahoraMs - inicioMs) / duracionMs, 0, 1);
}

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

function aGrados(radianes: number): number {
  return (radianes * 180) / Math.PI;
}
