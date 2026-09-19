import { apiClient } from '../apiClient';
import { obtenerIdDispositivo } from '../identidadDispositivo';
import type { RegistroTokenRequest } from '../tipos';

export const RUTA_REGISTRO_TOKEN = '/api/v1/dispositivos/notificaciones';

/**
 * Asocia el token de este navegador con el dispositivo anonimo del pasajero.
 *
 * El backend responde 204 y `apiClient` devuelve `null` en ese caso.
 */
export async function registrarTokenDelDispositivo(tokenNotificacion: string): Promise<void> {
  const solicitud: RegistroTokenRequest = {
    dispositivoId: obtenerIdDispositivo(),
    tokenNotificacion,
  };

  await apiClient.post<void>(RUTA_REGISTRO_TOKEN, solicitud);
}
