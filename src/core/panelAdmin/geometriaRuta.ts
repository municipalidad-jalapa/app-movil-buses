import type { Ruta } from '../tipos';
import type { PuntoGeo } from './rutasAdminApi';

/**
 * Cuentas del creador de rutas, fuera de React para probarlas sin montar nada.
 * Distancias planas: a escala de una ciudad el error es despreciable.
 */

const METROS_POR_GRADO_LATITUD = 110_540;
const METROS_POR_GRADO_LONGITUD = 111_320 * Math.cos((14.63 * Math.PI) / 180);

/** A esta distancia de la linea, una parada nueva se pega al recorrido. */
export const RADIO_PEGAR_PARADA_METROS = 60;

export function metrosEntre(a: PuntoGeo, b: PuntoGeo): number {
  const dy = (b.latitud - a.latitud) * METROS_POR_GRADO_LATITUD;
  const dx = (b.longitud - a.longitud) * METROS_POR_GRADO_LONGITUD;
  return Math.hypot(dx, dy);
}

export function largoEnMetros(trazado: PuntoGeo[]): number {
  let total = 0;
  for (let i = 1; i < trazado.length; i++) total += metrosEntre(trazado[i - 1], trazado[i]);
  return total;
}

/** "2,6 km", o "350 m" si no llega al kilometro. */
export function textoLargo(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

export interface Proyeccion {
  /** El punto de la linea mas cercano. */
  punto: PuntoGeo;
  /** A cuantos metros de la linea estaba el punto original. */
  distancia: number;
  /** Metros recorridos desde el inicio hasta ese punto. */
  recorrido: number;
}

/** Donde cae un punto sobre el recorrido. null sin recorrido. */
export function proyectar(trazado: PuntoGeo[], punto: PuntoGeo): Proyeccion | null {
  if (trazado.length < 2) return null;
  let mejor: Proyeccion | null = null;
  let acumulado = 0;
  for (let i = 1; i < trazado.length; i++) {
    const a = trazado[i - 1];
    const b = trazado[i];
    const ax = 0;
    const ay = 0;
    const bx = (b.longitud - a.longitud) * METROS_POR_GRADO_LONGITUD;
    const by = (b.latitud - a.latitud) * METROS_POR_GRADO_LATITUD;
    const px = (punto.longitud - a.longitud) * METROS_POR_GRADO_LONGITUD;
    const py = (punto.latitud - a.latitud) * METROS_POR_GRADO_LATITUD;
    const largo2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / largo2));
    const cerca = {
      latitud: a.latitud + (b.latitud - a.latitud) * t,
      longitud: a.longitud + (b.longitud - a.longitud) * t,
    };
    const distancia = metrosEntre(cerca, punto);
    if (!mejor || distancia < mejor.distancia) {
      mejor = { punto: cerca, distancia, recorrido: acumulado + Math.sqrt(largo2) * t };
    }
    acumulado += Math.sqrt(largo2);
  }
  return mejor;
}

/**
 * Donde queda una parada nueva: pegada a la linea si se marco cerca, o donde
 * se marco si el recorrido pasa lejos (o todavia no hay recorrido).
 */
export function lugarDeParada(trazado: PuntoGeo[], marcado: PuntoGeo): PuntoGeo {
  const p = proyectar(trazado, marcado);
  return p && p.distancia <= RADIO_PEGAR_PARADA_METROS ? p.punto : marcado;
}

/**
 * Suma un tramo ajustado al final del recorrido. El tramo empieza donde
 * terminaba el recorrido, asi que su primer punto no se repite.
 */
export function continuar(trazado: PuntoGeo[], tramo: PuntoGeo[]): PuntoGeo[] {
  if (trazado.length === 0) return tramo;
  const fin = trazado[trazado.length - 1];
  const sigue = tramo.length > 0 && metrosEntre(tramo[0], fin) < 1 ? tramo.slice(1) : tramo;
  return trazado.concat(sigue);
}

/**
 * Menos puntos para un trazo a mano que no se pudo ajustar a las calles
 * (Ramer-Douglas-Peucker): se conserva la forma sin los temblores del pulso.
 */
export function simplificar(puntos: PuntoGeo[], toleranciaMetros = 6): PuntoGeo[] {
  if (puntos.length <= 2) return puntos;
  const a = puntos[0];
  const b = puntos[puntos.length - 1];
  let mayor = 0;
  let indice = 0;
  for (let i = 1; i < puntos.length - 1; i++) {
    const d = proyectar([a, b], puntos[i])?.distancia ?? 0;
    if (d > mayor) {
      mayor = d;
      indice = i;
    }
  }
  if (mayor <= toleranciaMetros) return [a, b];
  const izquierda = simplificar(puntos.slice(0, indice + 1), toleranciaMetros);
  const derecha = simplificar(puntos.slice(indice), toleranciaMetros);
  return izquierda.slice(0, -1).concat(derecha);
}

export type PasoDeRuta = 'recorrido' | 'paradas' | 'lista' | 'publicada';

/** En que va una ruta, para la lista del panel. */
export function pasoDeRuta(ruta: Ruta): PasoDeRuta {
  if (ruta.activa) return 'publicada';
  if (ruta.trazado.length < 2) return 'recorrido';
  if (ruta.paradas.length < 2) return 'paradas';
  return 'lista';
}

export const TEXTO_PASO: Record<PasoDeRuta, string> = {
  recorrido: 'Paso 2 de 3 · falta el recorrido',
  paradas: 'Paso 2 de 3 · faltan paradas',
  lista: 'Paso 3 de 3 · lista para publicar',
  publicada: 'Publicada',
};

/** Las paradas que quedaron lejos del recorrido: se avisan antes de publicar. */
export function paradasLejos<P extends PuntoGeo & { nombre: string }>(trazado: PuntoGeo[], paradas: P[]): P[] {
  if (trazado.length < 2) return [];
  return paradas.filter((p) => (proyectar(trazado, p)?.distancia ?? 0) > RADIO_PEGAR_PARADA_METROS);
}
