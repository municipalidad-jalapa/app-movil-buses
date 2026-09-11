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

/*
 * La reserva vigente se recuerda en el telefono: si el pasajero recarga la
 * pagina o vuelve a abrir la app, sigue viendo que ya aviso, y no crea otra
 * que el backend le rechazaria por duplicada.
 */
const CLAVE_RESERVA = 'ecoruta_reserva_vigente';

export function leerReservaGuardada(ahora = Date.now()): RegistroCreadoResponse | null {
  try {
    const texto = localStorage.getItem(CLAVE_RESERVA);
    if (!texto) return null;
    const reserva = JSON.parse(texto) as RegistroCreadoResponse;
    if (!reserva?.id || Date.parse(reserva.expiraEn) <= ahora) {
      localStorage.removeItem(CLAVE_RESERVA);
      return null;
    }
    return reserva;
  } catch {
    return null;
  }
}

export function guardarReserva(reserva: RegistroCreadoResponse | null): void {
  try {
    if (reserva) localStorage.setItem(CLAVE_RESERVA, JSON.stringify(reserva));
    else localStorage.removeItem(CLAVE_RESERVA);
  } catch {
    // Sin almacenamiento la reserva sigue valiendo en el servidor; solo se
    // pierde el recuerdo al recargar.
  }
}