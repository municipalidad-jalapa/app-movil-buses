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
