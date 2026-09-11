import { apiClient } from './apiClient';
import { obtenerIdDispositivo } from './identidadDispositivo';
import { CABECERA_DISPOSITIVO } from './registroDemanda';
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

export async function confirmarAbordaje(
  reservaId: number,
  subio: boolean,
): Promise<RespuestaAbordaje> {
  const cuerpo: AbordajeRequest = { subio };
  // Solo el telefono que hizo la reserva puede responder por ella (403 si no).
  const respuesta = await apiClient.post<RespuestaAbordaje>(rutaDeAbordaje(reservaId), cuerpo, {
    cabeceras: { [CABECERA_DISPOSITIVO]: obtenerIdDispositivo() },
  });

  if (!respuesta) {
    throw new Error('La confirmacion de abordaje no devolvio una respuesta.');
  }

  return respuesta;
}
