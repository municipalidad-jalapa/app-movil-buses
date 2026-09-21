import { apiClient } from './apiClient';
import type { AvisoDeAtraso } from './atrasos';

/**
 * Tiempo estimado de llegada del bus (SCRUM-166) y el aviso de atraso que el
 * piloto haya reportado (SCRUM-26, bloque E).
 *
 * Los minutos y el aviso son dos cosas distintas: el cálculo mide lo que hace
 * el bus y el aviso dice lo que el piloto espera que pase. Se muestran juntos,
 * nunca sumados.
 */

export type EstadoDelBus =
  | 'EN_RUTA'
  | 'DETENIDO_EN_PARADA'
  | 'DETENIDO_FUERA_DE_PARADA'
  | 'EN_DESVIO'
  | 'SIN_DATOS';

export interface EtaParada {
  paradaId: number;
  orden: number;
  /** null cuando no se puede estimar: no se inventa un número. */
  minutos: number | null;
  confiable: boolean;
}

export interface Eta {
  rutaId: number;
  vehiculoId: number | null;
  calculadoEn: string;
  estado: EstadoDelBus;
  paradas: EtaParada[];
  atraso: AvisoDeAtraso | null;
}

/** Público: no requiere sesión. */
export async function consultarEta(rutaId: number, signal?: AbortSignal): Promise<Eta | null> {
  return (await apiClient.get<Eta>(`/api/v1/rutas/${rutaId}/eta`, { token: '', signal })) ?? null;
}

/** Minutos a la parada indicada, o al primer destino pendiente si no se pide una. */
export function minutosA(eta: Eta | null, paradaId?: number): number | null {
  if (!eta) return null;
  const parada = paradaId
    ? eta.paradas.find((p) => p.paradaId === paradaId)
    : eta.paradas.find((p) => p.minutos !== null);
  return parada?.minutos ?? null;
}
