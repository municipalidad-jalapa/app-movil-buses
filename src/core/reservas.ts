import { apiClient } from './apiClient';
import type { ReservasParada } from './tipos';

/** `GET /api/v1/paradas/{paradaId}/reservas` (HU-62). Requiere sesión de conductor. */
export function rutaReservasParada(paradaId: number): string {
  return `/api/v1/paradas/${paradaId}/reservas`;
}

/**
 * Reservas activas de una parada especifica.
 *
 * El panel del conductor (HU-62) llama esto una vez por parada del recorrido,
 * en cada ciclo de actualizacion.
 */
export async function obtenerReservasParada(
  paradaId: number,
  opciones: { signal?: AbortSignal } = {},
): Promise<ReservasParada> {
  const respuesta = await apiClient.get<ReservasParada>(
    rutaReservasParada(paradaId),
    opciones,
  );

  if (!respuesta) {
    throw new Error(`Sin respuesta al consultar las reservas de la parada ${paradaId}.`);
  }

  return respuesta;
}
