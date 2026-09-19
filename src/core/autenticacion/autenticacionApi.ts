import { apiClient } from '../apiClient';
import type { SesionConductor } from './sesionConductor';

interface RespuestaAuthConductor {
  token: string;
  expiraEn: number;
  rol: string;
}

export async function intercambiarTokenConductor(idToken: string): Promise<SesionConductor> {
  const respuesta = await apiClient.post<RespuestaAuthConductor>('/api/v1/auth/conductor', {
    idToken,
  });

  if (!respuesta?.token) {
    throw new Error('Respuesta de autenticacion incompleta.');
  }

  return {
    token: respuesta.token,
    expiraEn: respuesta.expiraEn,
    rol: respuesta.rol,
  };
}
