import type { Parada } from './tipos';

interface Punto {
  latitud: number;
  longitud: number;
}

/*
 * Distancias cortas dentro de Jalapa, con la misma aproximacion plana que usa
 * design/MapaOSM.dc.html: a esta latitud un grado de longitud mide unos
 * 107 km y uno de latitud unos 110,6 km. Para cientos de metros el error es
 * despreciable y no hace falta una formula esferica.
 */
const METROS_POR_GRADO_LONGITUD = 107_000;
const METROS_POR_GRADO_LATITUD = 110_600;

/** Paso de una persona a pie, en metros por minuto (el mismo del diseno). */
const METROS_POR_MINUTO_A_PIE = 80;

export function metrosEntre(a: Punto, b: Punto): number {
  const dx = (a.longitud - b.longitud) * METROS_POR_GRADO_LONGITUD;
  const dy = (a.latitud - b.latitud) * METROS_POR_GRADO_LATITUD;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

/** La parada mas cercana al pasajero, o null si la ruta no tiene paradas. */
export function paradaMasCercana<T extends Parada>(paradas: readonly T[], donde: Punto): T | null {
  let mejor: T | null = null;
  let menor = Infinity;
  for (const p of paradas) {
    const m = metrosEntre(p, donde);
    if (m < menor) {
      menor = m;
      mejor = p;
    }
  }
  return mejor;
}

/** "a 3 min a pie · 240 m", como la hoja de R2. Nunca menos de 1 minuto. */
export function textoDistancia(parada: Punto, donde: Punto): string {
  const metros = metrosEntre(parada, donde);
  const minutos = Math.max(1, Math.round(metros / METROS_POR_MINUTO_A_PIE));
  return `a ${minutos} min a pie · ${metros} m`;
}

/** Minutos que le quedan a una reserva, redondeados hacia arriba. 0 si ya vencio. */
export function minutosRestantes(expiraEn: string, ahora: number): number {
  const ms = Date.parse(expiraEn) - ahora;
  return ms > 0 ? Math.ceil(ms / 60_000) : 0;
}
