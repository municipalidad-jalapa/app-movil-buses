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

/** Lo que deja el borrador: lo que queda del recorrido y lo que se va. */
export interface Borrado {
  /** Los pedazos que quedan, en orden. Si hay mas de uno, se borro algo en medio. */
  quedan: PuntoGeo[][];
  /** Los pedazos que se van: se marcan mientras se pasa el borrador. */
  borrados: PuntoGeo[][];
}

/**
 * Pasa el borrador sobre el recorrido. `goma` es por donde paso el puntero y
 * `radio` el tamaño del borrador, en metros. Los tramos se cortan justo donde
 * entra y sale el circulo: una calle larga, sin vertices cerca, tambien se
 * borra. Un pedazo que queda mas corto que el borrador es un resto, se va.
 *
 * @return null si el borrador no toco el recorrido
 */
export function borrar(trazado: PuntoGeo[], goma: PuntoGeo[], radio: number): Borrado | null {
  if (trazado.length === 0 || goma.length === 0) return null;
  const origen = trazado[0];
  const plano = (p: PuntoGeo): [number, number] => [
    (p.longitud - origen.longitud) * METROS_POR_GRADO_LONGITUD,
    (p.latitud - origen.latitud) * METROS_POR_GRADO_LATITUD,
  ];

  // Un movimiento rapido deja huecos entre muestras del puntero: se rellenan
  // para que el borrador pase parejo, como una franja.
  const centros: [number, number][] = [];
  for (const p of goma) {
    const c = plano(p);
    const previo = centros.at(-1);
    if (previo) {
      const pasos = Math.ceil(Math.hypot(c[0] - previo[0], c[1] - previo[1]) / (radio / 2));
      for (let k = 1; k < pasos; k++) {
        centros.push([previo[0] + ((c[0] - previo[0]) * k) / pasos, previo[1] + ((c[1] - previo[1]) * k) / pasos]);
      }
    }
    centros.push(c);
  }
  const r2 = radio * radio;

  if (trazado.length === 1) {
    const [x, y] = plano(trazado[0]);
    return centros.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= r2) ? { quedan: [], borrados: [] } : null;
  }

  // Cada tramo se parte en pedazos que quedan y que se van; recorridos en
  // orden, pedazos seguidos del mismo tipo se juntan.
  const pedazos: { borrado: boolean; puntos: PuntoGeo[] }[] = [];
  let toco = false;
  for (let i = 1; i < trazado.length; i++) {
    const a = trazado[i - 1];
    const b = trazado[i];
    const [ax, ay] = plano(a);
    const [bx, by] = plano(b);
    const dx = bx - ax;
    const dy = by - ay;
    const largo2 = dx * dx + dy * dy;

    // Donde el tramo entra al circulo de cada centro: a + t(b - a), t en [0, 1].
    const fuera: [number, number][] = [];
    for (const [cx, cy] of centros) {
      if (cx < Math.min(ax, bx) - radio || cx > Math.max(ax, bx) + radio) continue;
      if (cy < Math.min(ay, by) - radio || cy > Math.max(ay, by) + radio) continue;
      const fx = ax - cx;
      const fy = ay - cy;
      if (largo2 === 0) {
        if (fx * fx + fy * fy <= r2) fuera.push([0, 1]);
        continue;
      }
      const mitad = fx * dx + fy * dy;
      const disc = mitad * mitad - largo2 * (fx * fx + fy * fy - r2);
      if (disc < 0) continue;
      const raiz = Math.sqrt(disc);
      const t1 = Math.max(0, (-mitad - raiz) / largo2);
      const t2 = Math.min(1, (-mitad + raiz) / largo2);
      if (t2 - t1 > 1e-9) fuera.push([t1, t2]);
    }
    fuera.sort((x, y) => x[0] - y[0]);

    const en = (t: number): PuntoGeo =>
      t <= 0 ? a : t >= 1 ? b : { latitud: a.latitud + (b.latitud - a.latitud) * t, longitud: a.longitud + (b.longitud - a.longitud) * t };
    const sumar = (desde: number, hasta: number, borrado: boolean) => {
      if (hasta - desde <= 1e-9) return;
      const ultimo = pedazos.at(-1);
      if (ultimo && ultimo.borrado === borrado) ultimo.puntos.push(en(hasta));
      else pedazos.push({ borrado, puntos: [en(desde), en(hasta)] });
    };

    let t = 0;
    for (const [desde, hasta] of fuera) {
      if (hasta <= t) continue;
      toco = true;
      sumar(t, Math.max(t, desde), false);
      sumar(Math.max(t, desde), hasta, true);
      t = hasta;
    }
    sumar(t, 1, false);
  }
  if (!toco) return null;

  return {
    quedan: pedazos.filter((p) => !p.borrado && largoEnMetros(p.puntos) >= Math.max(1, radio)).map((p) => p.puntos),
    borrados: pedazos.filter((p) => p.borrado).map((p) => p.puntos),
  };
}

/** Hasta donde se busca, desde la costura, un cruce que haya quedado atras. */
const LARGO_COSTURA_METROS = 300;
/** A esta distancia un cruce del camino de union esta sobre el recorrido. */
const SOBRE_LA_LINEA_METROS = 2;

/**
 * Une dos pedazos del recorrido por el camino que dio el ajuste a calles. Ese
 * camino sale y llega a cruces: si el de salida quedo atras, sobre el final de
 * `antes`, `antes` se recorta hasta ahi para que el bus no haga una ida y
 * vuelta; igual con el de llegada sobre el principio de `despues`.
 */
export function coser(antes: PuntoGeo[], camino: PuntoGeo[], despues: PuntoGeo[]): PuntoGeo[] {
  const salida = camino[0];
  const llegada = camino.at(-1);
  let a = antes;
  let b = despues;
  if (salida) {
    let recorrido = 0;
    for (let i = a.length - 1; i > 0 && recorrido <= LARGO_COSTURA_METROS; i--) {
      const p = proyectar([a[i - 1], a[i]], salida);
      if (p && p.distancia <= SOBRE_LA_LINEA_METROS) {
        a = [...a.slice(0, i), p.punto];
        break;
      }
      recorrido += metrosEntre(a[i - 1], a[i]);
    }
  }
  if (llegada) {
    let recorrido = 0;
    for (let i = 1; i < b.length && recorrido <= LARGO_COSTURA_METROS; i++) {
      const p = proyectar([b[i - 1], b[i]], llegada);
      if (p && p.distancia <= SOBRE_LA_LINEA_METROS) {
        b = [p.punto, ...b.slice(i)];
        break;
      }
      recorrido += metrosEntre(b[i - 1], b[i]);
    }
  }
  return continuar(continuar(a, camino), b);
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
