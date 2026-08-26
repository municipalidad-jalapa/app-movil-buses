import { apiClient } from './apiClient';
import type {
  CrearRegistroRequest,
  RegistroCreadoResponse,
} from './tipos';

export const RUTA_REGISTRO_DEMANDA = '/api/v1/demanda/registros';

/**
 * Registra que un pasajero está esperando en una parada.
 */
export async function registrarDemanda(
  solicitud: CrearRegistroRequest,
): Promise<RegistroCreadoResponse> {
  const respuesta = await apiClient.post<RegistroCreadoResponse>(
    RUTA_REGISTRO_DEMANDA,
    solicitud,
  );

  if (!respuesta) {
    throw new Error('El registro no devolvió una respuesta.');
  }

  return respuesta;
}