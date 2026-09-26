import { apiClient } from './apiClient';
import { metrosEntre } from './distanciaAParada';
import type { EstadoDelBusEta, Posicion, Punto } from './tipos';

/**
 * Panel del conductor (HU-62, HU-75, HU-76; QA 4.3 y 5.3).
 *
 * <p>Contrato de `GET /api/v1/conductor/panel`: la ruta sale de la sesion del
 * conductor, nunca se elige a mano. La regla de presentacion vive aqui, fuera
 * de React, para probarla sin montar nada.
 */

export interface ParadaDelPanel {
  paradaId: number;
  nombre: string;
  orden: number;
  reservasActivas: number;
  /** null: no hay estimacion. Nunca se inventa un numero. */
  minutos: number | null;
  confiable: boolean;
  /** ISO. Cuando la marco atendida hoy; null si sigue pendiente. */
  atendidaEn: string | null;
}

export interface PanelConductor {
  rutaId: number;
  rutaNombre: string;
  estadoBus: EstadoDelBusEta;
  calculadoEn: string;
  paradas: ParadaDelPanel[];
  /** Lo que conto el piloto al cerrar paradas hoy (botones Subió y Bajó). */
  subieronHoy?: number;
  bajaronHoy?: number;
  /** Subieron menos bajaron hoy; nunca negativo. */
  aBordo?: number;
  /** Vuelta del dia que se muestra (1, 2, ...): atendidaEn es de esta vuelta. */
  vuelta?: number;
}

/** Lo que el piloto conto en la parada, incluidos los que no avisaron por la app. */
export interface ConteoDeParada {
  subieron: number;
  bajaron: number;
}

export interface RespuestaAtencion {
  reservasCerradas: number;
  marcadaEn: string;
  /** En que vuelta del dia quedo cerrada. */
  vuelta?: number;
}

export const RUTA_PANEL_CONDUCTOR = '/api/v1/conductor/panel';

export function obtenerPanelConductor(signal?: AbortSignal) {
  return apiClient.get<PanelConductor>(RUTA_PANEL_CONDUCTOR, { signal, intentos: 1 });
}

/**
 * HU-76: cierra las reservas de la parada como abordadas. Con el conteo del
 * panel en ruta guarda tambien cuantos subieron y bajaron.
 */
export function marcarParadaAtendida(rutaId: number, paradaId: number, conteo?: ConteoDeParada) {
  return apiClient.post<RespuestaAtencion>(`/api/v1/rutas/${rutaId}/paradas/${paradaId}/atendida`, conteo, {
    intentos: 1,
  });
}

const hora = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Microcopy de DESIGN.md §10: "Llega en", nunca la palabra ETA. */
export function textoLlegada(parada: ParadaDelPanel, estadoBus: EstadoDelBusEta): string {
  if (parada.atendidaEn) return 'Ya pasaste por aquí';
  if (parada.minutos === null) {
    if (estadoBus === 'SIN_DATOS') return 'Sin ubicación del bus';
    if (estadoBus === 'DETENIDO_FUERA_DE_PARADA') return 'Bus detenido';
    return 'Sin estimación';
  }
  if (parada.minutos <= 0) return 'Llegando';
  const aproximado = !parada.confiable || estadoBus === 'EN_DESVIO';
  return aproximado ? `≈ ${parada.minutos} min` : `${parada.minutos} min`;
}

export function textoEstado(parada: ParadaDelPanel): string {
  return parada.atendidaEn ? `Atendida ${hora.format(new Date(parada.atendidaEn))}` : 'Pendiente';
}

/** La proxima parada pendiente del recorrido: la que el conductor mira primero. */
export function proximaPendiente(paradas: ParadaDelPanel[]): ParadaDelPanel | null {
  const pendientes = paradas.filter((p) => !p.atendidaEn);
  const conMinutos = pendientes.filter((p) => p.minutos !== null);
  if (conMinutos.length > 0) {
    return conMinutos.reduce((a, b) => ((a.minutos ?? 0) <= (b.minutos ?? 0) ? a : b));
  }
  return pendientes[0] ?? null;
}

/**
 * A cuantos metros de una parada el bus "esta en ella". Algo mas holgado que
 * el radio del ETA (40 m, eta.radio-parada-metros) por el error del GPS a
 * bordo, y bastante menos que los ~150 m que separan paradas de ida y de
 * vuelta en calles paralelas: asi no se confunde una con otra.
 */
export const RADIO_EN_PARADA_METROS = 60;

/** Una posicion del bus mas vieja que esto ya no dice en que parada esta. */
export const SEGUNDOS_POSICION_VIGENTE = 120;

/**
 * La parada pendiente en la que esta el bus: la mas cercana a su posicion, si
 * queda dentro de {@link RADIO_EN_PARADA_METROS}. null si el bus no esta en
 * ninguna o no se sabe donde esta.
 */
export function paradaDondeEstaElBus(
  paradas: ParadaDelPanel[],
  ubicaciones: ReadonlyMap<number, Punto>,
  bus: Punto | null,
): ParadaDelPanel | null {
  if (!bus) return null;
  let mejor: ParadaDelPanel | null = null;
  let menor = Infinity;
  for (const p of paradas) {
    const donde = ubicaciones.get(p.paradaId);
    if (p.atendidaEn || !donde) continue;
    const metros = metrosEntre(donde, bus);
    if (metros <= RADIO_EN_PARADA_METROS && metros < menor) {
      menor = metros;
      mejor = p;
    }
  }
  return mejor;
}

/**
 * La parada que el panel propone para "Llegué": aquella en la que esta el bus
 * segun el GPS; si no esta en ninguna, la proxima del recorrido.
 */
export function proximaParada(
  paradas: ParadaDelPanel[],
  ubicaciones: ReadonlyMap<number, Punto>,
  bus: Punto | null,
): ParadaDelPanel | null {
  return paradaDondeEstaElBus(paradas, ubicaciones, bus) ?? proximaPendiente(paradas);
}

/** La posicion del bus si todavia sirve para ubicarlo en una parada. */
export function posicionVigente(posicion: Posicion | null, ahora: number): Posicion | null {
  if (!posicion) return null;
  const capturada = Date.parse(posicion.timestamp);
  if (!Number.isFinite(capturada)) return posicion;
  return ahora - capturada <= SEGUNDOS_POSICION_VIGENTE * 1000 ? posicion : null;
}

export function totalEsperando(paradas: ParadaDelPanel[]): number {
  return paradas.reduce((suma, p) => suma + (p.atendidaEn ? 0 : p.reservasActivas), 0);
}

/** Una ruta publicada que el conductor puede elegir. */
export interface OpcionDeRuta {
  id: number;
  nombre: string;
}

/** Contrato de `GET/PUT /api/v1/conductor/ruta`. */
export interface RutaDelConductor {
  /** null: todavia no eligio ninguna. */
  rutaId: number | null;
  rutaNombre: string | null;
  rutas: OpcionDeRuta[];
}

export const RUTA_DEL_CONDUCTOR = '/api/v1/conductor/ruta';

export function obtenerRutaConductor(signal?: AbortSignal) {
  return apiClient.get<RutaDelConductor>(RUTA_DEL_CONDUCTOR, { signal, intentos: 1 });
}

/** Vale de inmediato para el panel, las paradas, el abordaje y los atrasos. */
export function elegirRutaConductor(rutaId: number) {
  return apiClient.put<RutaDelConductor>(RUTA_DEL_CONDUCTOR, { rutaId }, { intentos: 1 });
}

const CLAVE_RUTA_CONFIRMADA = 'ecoruta_conductor_ruta_confirmada';

/**
 * ¿Ya confirmo la ruta en esta sesion del navegador? Al entrar se le pregunta
 * una vez; despues la ruta queda en la barra. Sin almacenamiento (ventana
 * privada, datos bloqueados) se pregunta de nuevo, que es lo seguro.
 */
export function rutaYaConfirmada(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_RUTA_CONFIRMADA) === '1';
  } catch {
    return false;
  }
}

export function recordarRutaConfirmada(): void {
  try {
    sessionStorage.setItem(CLAVE_RUTA_CONFIRMADA, '1');
  } catch {
    // Sin almacenamiento solo se vuelve a preguntar al recargar.
  }
}
