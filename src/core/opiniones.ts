import { apiClient, peticion } from './apiClient';
import { obtenerIdDispositivo } from './identidadDispositivo';
import { CABECERA_DISPOSITIVO } from './registroDemanda';
import { ErrorApi } from './errores';

/** Opiniones del servicio (SCRUM-26, bloque A). */

export type TipoOpinion = 'queja' | 'comentario' | 'calificacion';

export const TEXTO_MAXIMO = 500;

export interface NuevaOpinion {
  tipo: TipoOpinion;
  rutaId: number;
  texto?: string;
  estrellas?: number;
  reservaId?: number;
  /** SCRUM-26, bloque F: las tres valoraciones, cada una de 1 a 5 y opcional. */
  calidad?: number;
  limpieza?: number;
  conduccion?: number;
}

/** Las tres dimensiones que la gente puntúa por separado (bloque F). */
export type DimensionDeOpinion = 'calidad' | 'limpieza' | 'conduccion';

export const DIMENSIONES: { clave: DimensionDeOpinion; etiqueta: string }[] = [
  { clave: 'calidad', etiqueta: 'Calidad del servicio' },
  { clave: 'limpieza', etiqueta: 'Limpieza de la unidad' },
  { clave: 'conduccion', etiqueta: 'Conducción prudente' },
];

export interface OpinionCreada {
  id: number;
  rutaId: number;
  vehiculoId: number | null;
}

/** Se atribuye al identificador anonimo del navegador y, si hay sesion, a la cuenta del pasajero. */
export async function enviarOpinion(opinion: NuevaOpinion, tokenPasajero?: string): Promise<OpinionCreada> {
  const respuesta = await apiClient.post<OpinionCreada>('/api/v1/opiniones', opinion, {
    cabeceras: { [CABECERA_DISPOSITIVO]: obtenerIdDispositivo() },
    // Con sesion de pasajero la opinion queda tambien en su cuenta (bloque B).
    // Sin ella no se manda ningun token: nunca el del conductor.
    token: tokenPasajero ?? '',
    // Un reintento automatico podria registrar la misma opinion dos veces.
    intentos: 1,
  });
  if (!respuesta) {
    throw new Error('El registro de la opinion no devolvio una respuesta.');
  }
  return respuesta;
}

export function esLimiteDeEnvios(causa: unknown): boolean {
  return causa instanceof ErrorApi && causa.status === 429;
}

// ---------------------------------------------------------------------------
// Panel municipal
// ---------------------------------------------------------------------------

export interface OpinionDelPanel {
  id: number;
  creadaEn: string;
  tipo: TipoOpinion;
  rutaId: number;
  ruta: string;
  vehiculoId: number | null;
  vehiculo: string | null;
  estrellas: number | null;
  /** SCRUM-26, bloque F: null cuando el pasajero no puntuó esa dimensión. */
  calidad: number | null;
  limpieza: number | null;
  conduccion: number | null;
  /** Ya neutralizado por el backend: se muestra como texto, nunca como HTML. */
  texto: string | null;
  atendidaEn: string | null;
  atendidaPor: string | null;
}

export interface PromedioOpiniones {
  id: number;
  nombre: string;
  promedio: number | null;
  /** Bloque F: un promedio en null es «sin datos», nunca un cero. */
  calidad: number | null;
  limpieza: number | null;
  conduccion: number | null;
  calificadas: number;
  opiniones: number;
}

export interface PaginaDeOpiniones {
  total: number;
  pagina: number;
  tamano: number;
  opiniones: OpinionDelPanel[];
  resumen: {
    total: number;
    promedioPorRuta: PromedioOpiniones[];
    promedioPorVehiculo: PromedioOpiniones[];
  };
}

export interface FiltrosOpiniones {
  tipo?: TipoOpinion | '';
  rutaId?: number | '';
  vehiculoId?: number | '';
  /** yyyy-mm-dd, fecha local. */
  desde?: string;
  hasta?: string;
  pagina?: number;
  tamano?: number;
}

/** yyyy-mm-dd local -> instante ISO del inicio de ese dia (o del siguiente, para "hasta"). */
function inicioDelDia(fecha: string, diasDespues = 0): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia + diasDespues).toISOString();
}

export function consultaDeOpiniones(filtros: FiltrosOpiniones): string {
  const parametros = new URLSearchParams();
  if (filtros.tipo) parametros.set('tipo', filtros.tipo);
  if (filtros.rutaId) parametros.set('rutaId', String(filtros.rutaId));
  if (filtros.vehiculoId) parametros.set('vehiculoId', String(filtros.vehiculoId));
  if (filtros.desde) parametros.set('desde', inicioDelDia(filtros.desde));
  // "Hasta" incluye el dia completo.
  if (filtros.hasta) parametros.set('hasta', inicioDelDia(filtros.hasta, 1));
  parametros.set('pagina', String(filtros.pagina ?? 0));
  parametros.set('tamano', String(filtros.tamano ?? 20));
  return `/api/v1/opiniones?${parametros.toString()}`;
}

export async function listarOpiniones(
  token: string,
  filtros: FiltrosOpiniones,
  signal?: AbortSignal,
): Promise<PaginaDeOpiniones> {
  const respuesta = await apiClient.get<PaginaDeOpiniones>(consultaDeOpiniones(filtros), { token, signal });
  if (!respuesta) throw new Error('El listado de opiniones no devolvio una respuesta.');
  return respuesta;
}

export async function marcarAtendida(
  token: string,
  id: number,
): Promise<{ id: number; atendidaPor: string; atendidaEn: string }> {
  const respuesta = await peticion<{ id: number; atendidaPor: string; atendidaEn: string }>(
    `/api/v1/opiniones/${id}/atendida`,
    { token, metodo: 'PATCH', intentos: 1 },
  );
  if (!respuesta) throw new Error('Marcar como atendida no devolvio una respuesta.');
  return respuesta;
}

/**
 * El backend neutraliza el texto (&lt; &gt; &amp; ...). React ya escapa al
 * pintar, asi que se decodifica a texto plano para no mostrar "&lt;" literal:
 * sigue saliendo como texto, jamas como HTML.
 */
export function textoPlano(neutralizado: string): string {
  return neutralizado
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}
