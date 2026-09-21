import { apiClient } from '../apiClient';
import type { Posicion } from '../tipos';
import { aMilisegundos, type SesionAdmin } from './sesionAdmin';

interface RespuestaSesionAdmin {
  token: string;
  expiraEn: string | number;
  rol: string;
  inactividadMinutos: number;
}

export type EstadoDelServicio = 'EN_RUTA' | 'SIN_DATOS_RECIENTES' | 'SIN_BUS';

export interface RutaEnServicio {
  rutaId: number;
  nombre: string;
  paradas: number;
  bus: { id: number; identificador: string; placa: string } | null;
  estado: EstadoDelServicio;
  posicion: Posicion | null;
}

export interface EstadoServicio {
  consultadoEn: string;
  rutas: RutaEnServicio[];
}

function aSesion(respuesta: RespuestaSesionAdmin | null, correo: string): SesionAdmin {
  if (!respuesta?.token) {
    throw new Error('Respuesta de autenticacion incompleta.');
  }
  return {
    token: respuesta.token,
    expiraEnMs: aMilisegundos(respuesta.expiraEn),
    inactividadMinutos: respuesta.inactividadMinutos,
    correo,
  };
}

/** idToken de Firebase -> sesion del panel. 401 idToken invalido, 403 cuenta sin rol de administrador. */
export async function intercambiarTokenAdmin(idToken: string, correo: string): Promise<SesionAdmin> {
  const respuesta = await apiClient.post<RespuestaSesionAdmin>('/api/v1/auth/admin', { idToken }, { intentos: 1 });
  return aSesion(respuesta, correo);
}

/** Sesion nueva mientras hay actividad. Sin actividad no se llama y el token vence solo. */
export async function renovarSesionAdmin(sesion: SesionAdmin): Promise<SesionAdmin> {
  const respuesta = await apiClient.post<RespuestaSesionAdmin>('/api/v1/admin/sesion/renovacion', undefined, {
    token: sesion.token,
    intentos: 1,
  });
  return aSesion(respuesta, sesion.correo);
}

export async function consultarServicio(token: string, signal?: AbortSignal): Promise<EstadoServicio> {
  const respuesta = await apiClient.get<EstadoServicio>('/api/v1/admin/servicio', { token, signal });
  return respuesta ?? { consultadoEn: new Date().toISOString(), rutas: [] };
}

// ---------------------------------------------------------------------------
// Pasajeros subidos (SCRUM-26, bloque F)
// ---------------------------------------------------------------------------

export type Granularidad = 'DIA' | 'SEMANA' | 'MES';

export interface ConteoPorGrupo {
  id: number;
  nombre: string;
  abordajes: number;
}

export interface AbordajesPorPeriodo {
  periodo: string;
  abordajes: number;
}

export interface ConteoDeAbordajes {
  total: number;
  granularidad: Granularidad;
  porRuta: ConteoPorGrupo[];
  porVehiculo: ConteoPorGrupo[];
  porPeriodo: AbordajesPorPeriodo[];
}

export interface FiltrosAbordajes {
  rutaId?: number | '';
  vehiculoId?: number | '';
  desde?: string;
  hasta?: string;
  granularidad?: Lowercase<Granularidad>;
}

/**
 * Cuenta los abordajes que marcó el piloto, que es el dato que prevalece.
 * Lo que respondió el pasajero no entra: si se contaran las dos fuentes, el
 * número dejaría de ser comparable entre rutas.
 */
export async function consultarAbordajes(
  token: string,
  filtros: FiltrosAbordajes = {},
  signal?: AbortSignal,
): Promise<ConteoDeAbordajes> {
  const parametros = new URLSearchParams();
  if (filtros.rutaId) parametros.set('rutaId', String(filtros.rutaId));
  if (filtros.vehiculoId) parametros.set('vehiculoId', String(filtros.vehiculoId));
  if (filtros.desde) parametros.set('desde', `${filtros.desde}T00:00:00Z`);
  if (filtros.hasta) parametros.set('hasta', `${filtros.hasta}T23:59:59Z`);
  if (filtros.granularidad) parametros.set('granularidad', filtros.granularidad);

  const consulta = parametros.toString();
  const respuesta = await apiClient.get<ConteoDeAbordajes>(
    `/api/v1/admin/abordajes${consulta ? `?${consulta}` : ''}`,
    { token, signal },
  );
  if (!respuesta) {
    throw new Error('El conteo de abordajes no devolvió una respuesta.');
  }
  return respuesta;
}
