import { apiClient } from './apiClient';
import type {
  CrearRegistroRequest,
  RegistroCreadoResponse,
} from './tipos';

/**
 * El backend expone esto como `reservas`, no como `demanda/registros`.
 *
 * OJO CON EL VOCABULARIO: HU-53 llamo "registro de demanda" a lo mismo que el
 * backend implemento como "reserva". El contrato coincide campo por campo
 * —dispositivoId, paradaId, latitud, longitud, y la respuesta con id, paradaId,
 * estado y expiraEn—; lo unico que no coincidia era la ruta, asi que la pantalla
 * respondia 404 contra un backend que funcionaba bien.
 *
 * Se alinea el frontend, no el backend: "reserva" es el termino del producto,
 * es lo que ya expone la API (ver /api/v1/reservas en Swagger) y es lo que usa
 * el contrato de HU-58 en Jira.
 */
export const RUTA_REGISTRO_DEMANDA = '/api/v1/reservas';

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