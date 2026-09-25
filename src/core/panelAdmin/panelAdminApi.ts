import { apiClient } from '../apiClient';
import { config } from '../config';
import { ErrorApi } from '../errores';
import type { ApiError, Posicion } from '../tipos';
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

export interface PosicionPanel {
  latitud: number;
  longitud: number;
  registradaEn: string;
}

export interface ReservaPorParada {
  paradaId: number;
  activas: number;
}

export interface PanelRuta {
  rutaId: number;
  nombre: string;
  vehiculoId: number | null;
  posicion: PosicionPanel | null;
  transmitiendo: boolean;
  reservasPorParada: ReservaPorParada[];
}

export interface PanelRutas {
  rutas: PanelRuta[];
}

export async function consultarPanel(token: string, signal?: AbortSignal): Promise<PanelRutas> {
  const respuesta = await apiClient.get<PanelRutas>('/api/v1/panel/rutas', { token, signal });
  return respuesta ?? { rutas: [] };
}

/** Maximo de dias que acepta el backend en una exportacion. */
export const MAXIMO_DIAS_EXPORTACION = 366;

export interface ArchivoExportado {
  blob: Blob;
  nombre: string;
}

const TIMEOUT_EXPORTACION_MS = 60_000;
const DIA_MS = 86_400_000;

/** Dias del rango, ambos extremos inclusivos, para fechas `AAAA-MM-DD`. */
export function diasDelRango(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA_MS) + 1;
}

function nombreDeContentDisposition(cabecera: string | null, respaldo: string): string {
  const coincidencia = cabecera?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!coincidencia) return respaldo;
  try {
    return decodeURIComponent(coincidencia[1]);
  } catch {
    return coincidencia[1];
  }
}

/**
 * HU-86: descarga el `.xlsx` de demanda y recorridos. Va con `fetch` y Bearer (no `<a href>`)
 * porque el token no viaja en un enlace. 400 formato, 401 sesion, 403 rol, 422 rango invalido.
 */
export async function exportarDatosDelServicio(
  token: string,
  desde: string,
  hasta: string,
  signal?: AbortSignal,
): Promise<ArchivoExportado> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_EXPORTACION_MS);
  signal?.addEventListener('abort', () => control.abort(), { once: true });

  const consulta = new URLSearchParams({ desde, hasta });
  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.apiBaseUrl}/api/v1/admin/exportaciones/servicio?${consulta}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: control.signal,
    });
  } catch (causa) {
    if (signal?.aborted) throw new ErrorApi(0, 'Peticion cancelada');
    throw new ErrorApi(0, control.signal.aborted ? 'Tiempo de espera agotado' : `Fallo de red: ${String(causa)}`);
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    let detalle: ApiError | null = null;
    try {
      const cuerpo = (await respuesta.json()) as ApiError;
      if (cuerpo && typeof cuerpo.message === 'string') detalle = cuerpo;
    } catch {
      /* cuerpo sin formato ApiError */
    }
    throw new ErrorApi(respuesta.status, detalle?.message ?? `${respuesta.status} ${respuesta.statusText}`, detalle);
  }

  return {
    blob: await respuesta.blob(),
    nombre: nombreDeContentDisposition(
      respuesta.headers.get('Content-Disposition'),
      `exportacion-servicio_${desde}_${hasta}.xlsx`,
    ),
  };
}
