import { apiClient } from '../apiClient';

/** Contratos de `VehiculoAdminController`: cualquier admin del panel municipal. */

export interface Vehiculo {
  id: number;
  identificador: string;
  placa: string;
  activo: boolean;
  rutaId: number | null;
  /** Personas que caben; da el nivel de ocupacion que ve el pasajero. */
  capacidad: number | null;
}

export interface DatosVehiculo {
  identificador: string;
  placa: string;
  rutaId: number | null;
  capacidad: number | null;
}

export async function listarVehiculos(token: string, signal?: AbortSignal): Promise<Vehiculo[]> {
  return (await apiClient.get<Vehiculo[]>('/api/v1/admin/vehiculos', { token, signal })) ?? [];
}

export async function crearVehiculo(token: string, datos: DatosVehiculo): Promise<Vehiculo | null> {
  return apiClient.post<Vehiculo>('/api/v1/admin/vehiculos', datos, { token, intentos: 1 });
}

/** Ruta y capacidad van juntas: null quita la ruta o la capacidad. */
export async function asignarVehiculo(
  token: string,
  vehiculoId: number,
  datos: { rutaId: number | null; capacidad: number | null },
): Promise<Vehiculo | null> {
  return apiClient.put<Vehiculo>(`/api/v1/admin/vehiculos/${vehiculoId}/asignacion`, datos, {
    token,
    intentos: 1,
  });
}
