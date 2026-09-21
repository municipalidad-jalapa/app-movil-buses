import { apiClient } from './apiClient';

/**
 * Aviso de atraso del piloto (SCRUM-26, bloque E).
 *
 * El piloto reporta que viene demorado y el pasajero lo ve junto al tiempo
 * estimado. La ruta no viaja en la peticion: la resuelve el servidor con la
 * cuenta del piloto, que solo puede reportar sobre la suya.
 */

export type MotivoDeAtraso = 'TRAFICO' | 'INCIDENTE';

export const DEMORA_MINIMA = 1;
export const DEMORA_MAXIMA = 120;
export const COMENTARIO_MAXIMO = 200;

export interface AvisoDeAtraso {
  id: number;
  rutaId: number;
  motivo: MotivoDeAtraso;
  demoraMinutos: number;
  comentario: string | null;
  reportadoEn: string;
  vigenteHasta: string;
}

export interface NuevoAtraso {
  motivo: Lowercase<MotivoDeAtraso>;
  demoraMinutos: number;
  comentario?: string;
}

/** Texto que ve la gente. El motivo es una lista corta, no texto libre. */
export const TEXTO_DEL_MOTIVO: Record<MotivoDeAtraso, string> = {
  TRAFICO: 'tráfico',
  INCIDENTE: 'un incidente',
};

export async function reportarAtraso(atraso: NuevoAtraso): Promise<AvisoDeAtraso> {
  const respuesta = await apiClient.post<AvisoDeAtraso>('/api/v1/conductor/atrasos', atraso, {
    // Reintentar podria dejar dos avisos seguidos del mismo atraso.
    intentos: 1,
  });
  if (!respuesta) {
    throw new Error('El aviso de atraso no devolvió una respuesta.');
  }
  return respuesta;
}

/** null cuando el piloto no tiene ningun atraso reportado (el backend responde 204). */
export async function atrasoVigente(): Promise<AvisoDeAtraso | null> {
  return (await apiClient.get<AvisoDeAtraso>('/api/v1/conductor/atrasos/vigente')) ?? null;
}

export async function retirarAtraso(): Promise<void> {
  await apiClient.delete('/api/v1/conductor/atrasos/vigente', { intentos: 1 });
}

/** El texto del comentario llega neutralizado del backend; se muestra como se escribió. */
export function textoPlano(texto: string | null): string {
  if (!texto) return '';
  return texto
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}
