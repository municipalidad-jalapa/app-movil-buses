import { apiClient } from '../apiClient';
import type { Ruta } from '../tipos';

/**
 * Correccion de rutas desde el panel municipal (QA 5.6).
 * Contratos de `RutaAdminController` en el backend.
 */

export interface PuntoGeo {
  latitud: number;
  longitud: number;
}

export async function listarRutasAdmin(token: string, signal?: AbortSignal): Promise<Ruta[]> {
  return (await apiClient.get<Ruta[]>('/api/v1/admin/rutas', { token, signal })) ?? [];
}

export async function guardarTrazado(token: string, rutaId: number, puntos: PuntoGeo[]): Promise<Ruta | null> {
  return apiClient.put<Ruta>(`/api/v1/admin/rutas/${rutaId}/trazado`, { puntos }, { token, intentos: 1 });
}

export async function guardarParada(
  token: string,
  rutaId: number,
  paradaId: number,
  datos: { nombre: string } & PuntoGeo,
): Promise<Ruta | null> {
  return apiClient.put<Ruta>(`/api/v1/admin/rutas/${rutaId}/paradas/${paradaId}`, datos, { token, intentos: 1 });
}

/**
 * Donde insertar un punto nuevo del trazado: despues del vertice que empieza
 * el tramo mas cercano al clic. Asi un clic sobre la linea la "dobla" ahi en
 * vez de agregar el punto al final. Distancia plana: a escala de una ciudad
 * sobra.
 */
export function indiceDeInsercion(trazado: PuntoGeo[], punto: PuntoGeo): number {
  if (trazado.length < 2) return trazado.length;
  let mejor = trazado.length;
  let menor = Number.POSITIVE_INFINITY;
  for (let i = 0; i < trazado.length - 1; i++) {
    const d = distanciaASegmento(punto, trazado[i], trazado[i + 1]);
    if (d < menor) {
      menor = d;
      mejor = i + 1;
    }
  }
  return mejor;
}

function distanciaASegmento(p: PuntoGeo, a: PuntoGeo, b: PuntoGeo): number {
  const dx = b.longitud - a.longitud;
  const dy = b.latitud - a.latitud;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.longitud - a.longitud) * dx + (p.latitud - a.latitud) * dy) / largo2));
  const x = a.longitud + t * dx - p.longitud;
  const y = a.latitud + t * dy - p.latitud;
  return x * x + y * y;
}

/** Ruta nueva: nace en borrador, el pasajero no la ve hasta publicarla. */
export async function crearRuta(token: string, nombre: string): Promise<Ruta | null> {
  return apiClient.post<Ruta>('/api/v1/admin/rutas', { nombre }, { token, intentos: 1 });
}

/** Parada nueva al final del recorrido; despues se arrastra a su lugar. */
export async function agregarParada(
  token: string,
  rutaId: number,
  datos: { nombre: string } & PuntoGeo,
): Promise<Ruta | null> {
  return apiClient.post<Ruta>(`/api/v1/admin/rutas/${rutaId}/paradas`, datos, { token, intentos: 1 });
}

/**
 * Saca la parada del recorrido; las siguientes suben un lugar. El historial se
 * conserva y las reservas vigentes en ella se cancelan.
 */
export async function eliminarParada(token: string, rutaId: number, paradaId: number): Promise<Ruta | null> {
  return apiClient.delete<Ruta>(`/api/v1/admin/rutas/${rutaId}/paradas/${paradaId}`, { token, intentos: 1 });
}

/** Publicar pide al menos 2 paradas y el trazado. */
export async function publicarRuta(token: string, rutaId: number, activa: boolean): Promise<Ruta | null> {
  return apiClient.put<Ruta>(`/api/v1/admin/rutas/${rutaId}/publicacion`, { activa }, { token, intentos: 1 });
}

/** Centro de Jalapa: donde cae la primera parada de una ruta sin nada. */
export const CENTRO_JALAPA: PuntoGeo = { latitud: 14.6355, longitud: -89.9885 };

/** Donde poner una parada nueva: un poco mas alla de la ultima, o en el centro. */
export function puntoParaParadaNueva(paradas: PuntoGeo[], trazado: PuntoGeo[]): PuntoGeo {
  const ultima = paradas.at(-1) ?? trazado.at(-1);
  if (!ultima) return CENTRO_JALAPA;
  return { latitud: ultima.latitud + 0.0008, longitud: ultima.longitud + 0.0008 };
}
