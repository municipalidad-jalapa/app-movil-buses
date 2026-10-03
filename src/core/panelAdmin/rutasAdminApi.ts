import { apiClient } from '../apiClient';
import type { Ruta } from '../tipos';

/**
 * El creador de rutas del panel municipal (informe de QA, panel del
 * administrador). Contratos de `RutaAdminController` en el backend.
 */

export interface PuntoGeo {
  latitud: number;
  longitud: number;
}

export async function listarRutasAdmin(token: string, signal?: AbortSignal): Promise<Ruta[]> {
  return (await apiClient.get<Ruta[]>('/api/v1/admin/rutas', { token, signal })) ?? [];
}

/**
 * Reemplaza el recorrido. El editor lo manda solo con cada cambio; sin puntos
 * deja la ruta sin recorrido ("empezar de nuevo"). Las paradas vuelven
 * renumeradas segun el recorrido nuevo.
 */
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

/** Ruta nueva: nace en borrador, el pasajero no la ve hasta publicarla. */
export async function crearRuta(token: string, nombre: string): Promise<Ruta | null> {
  return apiClient.post<Ruta>('/api/v1/admin/rutas', { nombre }, { token, intentos: 1 });
}

/**
 * Parada nueva donde la marco el administrador (clic derecho o mantener
 * presionado). Vuelve la ruta con la parada numerada segun el recorrido.
 */
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

/**
 * Elimina la ruta: deja de verse en el panel, para el pasajero y para el
 * conductor. El historial se conserva en los reportes.
 */
export async function eliminarRuta(token: string, rutaId: number): Promise<void> {
  await apiClient.delete(`/api/v1/admin/rutas/${rutaId}`, { token, intentos: 1 });
}

export interface TrazoAjustado {
  puntos: PuntoGeo[];
  /** false: no habia calle cerca; el tramo queda como se dibujo. */
  ajustado: boolean;
}

/**
 * El lapiz: ajusta a las calles de Jalapa un trazo dibujado a mano. Lo hace el
 * backend con la red de calles de OpenStreetMap que tiene en la base.
 */
export async function ajustarACalles(token: string, puntos: PuntoGeo[]): Promise<TrazoAjustado | null> {
  return apiClient.post<TrazoAjustado>('/api/v1/admin/rutas/ajuste-a-calles', { puntos }, { token, intentos: 1 });
}
