import { apiClient } from './apiClient';
import type { EstadoDelBusEta } from './tipos';

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
}

/** Lo que el piloto conto en la parada, incluidos los que no avisaron por la app. */
export interface ConteoDeParada {
  subieron: number;
  bajaron: number;
}

export interface RespuestaAtencion {
  reservasCerradas: number;
  marcadaEn: string;
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

export function totalEsperando(paradas: ParadaDelPanel[]): number {
  return paradas.reduce((suma, p) => suma + (p.atendidaEn ? 0 : p.reservasActivas), 0);
}
