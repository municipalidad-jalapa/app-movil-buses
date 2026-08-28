import { apiClient } from './apiClient';
import { config } from './config';
import { ErrorApi } from './errores';
import type { AbordajeRequest, RespuestaAbordaje } from './tipos';

/**
 * Confirmacion de abordaje (HU-58).
 *
 * El pasajero responde si logro subir al bus. La reserva pasa a ABORDO o a
 * CANCELADA, y deja de quedar colgada en ACTIVA hasta que expire sola.
 */

export function rutaDeAbordaje(reservaId: number): string {
  return `/api/v1/reservas/${reservaId}/abordaje`;
}

/** El backend responde 422 cuando la reserva ya vencio o ya fue respondida. */
export function esReservaInactiva(causa: unknown): boolean {
  return causa instanceof ErrorApi && causa.status === 422;
}

/**
 * Respuesta simulada para poder demostrar la historia.
 *
 * El backend todavia no tiene `/api/v1/reservas/{id}/abordaje`, asi que sin esto
 * el ultimo paso de la demo termina siempre en un error de red. Se enciende con
 * VITE_SIMULAR_ABORDAJE=true y jamas deberia estar activa en produccion.
 */
function respuestaSimulada(reservaId: number, subio: boolean): RespuestaAbordaje {
  return { id: reservaId, estado: subio ? 'ABORDO' : 'CANCELADA' };
}

export async function confirmarAbordaje(
  reservaId: number,
  subio: boolean,
): Promise<RespuestaAbordaje> {
  if (config.simularAbordaje) {
    return respuestaSimulada(reservaId, subio);
  }

  const cuerpo: AbordajeRequest = { subio };
  const respuesta = await apiClient.post<RespuestaAbordaje>(rutaDeAbordaje(reservaId), cuerpo);

  if (!respuesta) {
    throw new Error('La confirmacion de abordaje no devolvio una respuesta.');
  }

  return respuesta;
}
