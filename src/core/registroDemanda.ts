import { apiClient } from './apiClient';
import type {
  CrearRegistroRequest,
  EstadoReserva,
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

/**
 * Cabecera con la que el backend comprueba que la reserva es de este telefono.
 * Sin ella, renovar o cancelar responde 400; con la de otro, 403.
 */
export const CABECERA_DISPOSITIVO = 'X-Dispositivo-Id';

/** El pasajero ya no va a esperar (HU-124). El backend responde 204. */
export async function cancelarReserva(reservaId: number, dispositivoId: string): Promise<void> {
  await apiClient.delete<void>(`${RUTA_REGISTRO_DEMANDA}/${reservaId}`, {
    cabeceras: { [CABECERA_DISPOSITIVO]: dispositivoId },
  });
}

/** Otro periodo completo de vigencia, conservando la misma reserva (HU-52). */
export async function renovarReserva(
  reservaId: number,
  dispositivoId: string,
): Promise<RegistroCreadoResponse> {
  const respuesta = await apiClient.post<RegistroCreadoResponse>(
    `${RUTA_REGISTRO_DEMANDA}/${reservaId}/renovacion`,
    undefined,
    { cabeceras: { [CABECERA_DISPOSITIVO]: dispositivoId } },
  );
  if (!respuesta) {
    throw new Error('La renovación no devolvió una respuesta.');
  }
  return respuesta;
}

/** Lo que devuelve `GET /api/v1/reservas/{id}` (HU-76) y que usa la app. */
export interface EstadoEnServidor {
  id: number;
  paradaId: number;
  estado: EstadoReserva;
  expiraEn: string;
}

/**
 * La reserva tal como la tiene el servidor. La app la guarda en el telefono y
 * sin esto no se enteraba de lo que pasa del otro lado: el conductor la marco
 * abordada, el servidor la expiro o se renovo desde otra pestana (QA, ronda 2).
 */
export async function consultarReserva(reservaId: number, dispositivoId: string): Promise<EstadoEnServidor | null> {
  // Este endpoint (HU-76) recibe el dispositivo por query, no por cabecera.
  const consulta = new URLSearchParams({ dispositivoId });
  return apiClient.get<EstadoEnServidor>(`${RUTA_REGISTRO_DEMANDA}/${reservaId}?${consulta.toString()}`, {
    intentos: 1,
  });
}
