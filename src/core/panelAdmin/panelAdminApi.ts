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
