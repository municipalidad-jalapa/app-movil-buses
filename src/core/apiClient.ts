import { obtenerConfiguracion } from './config';
import { ErrorApi } from './errores';
import type { ApiError } from './tipos';

/**
 * Cliente HTTP unico de la app.
 *
 * Todo acceso al backend pasa por aca. Centraliza tres cosas que si se repiten en
 * cada pantalla terminan mal: la URL base, el timeout y la traduccion de errores.
 */

/** La ruta tiene cobertura irregular: nunca dejar al usuario esperando indefinidamente. */
const TIMEOUT_MS = 10_000;

export interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  /** Token JWT, para los endpoints de conductor y admin. El pasajero es anonimo. */
  token?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/** Intenta leer el ApiError del backend. Si el cuerpo no tiene ese formato, devuelve null. */
async function leerApiError(respuesta: Response): Promise<ApiError | null> {
  try {
    const cuerpo = (await respuesta.json()) as unknown;
    if (
      cuerpo &&
      typeof cuerpo === 'object' &&
      'status' in cuerpo &&
      'message' in cuerpo
    ) {
      return cuerpo as ApiError;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Hace una peticion al backend.
 *
 * Devuelve `null` en 204 sin contenido: lo necesita HU-44, donde el backend responde
 * 204 cuando todavia no hay ninguna posicion del bus (no es un error).
 *
 * @throws {ErrorApi} en cualquier respuesta que no sea 2xx, y tambien si falla la red.
 */
export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T | null> {
  const { apiUrl } = obtenerConfiguracion();
  const { metodo = 'GET', cuerpo, token, timeoutMs = TIMEOUT_MS, signal } = opciones;

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  // Si quien llama trae su propio signal (por ejemplo, un componente que se desmonta),
  // lo encadenamos con el del timeout.
  signal?.addEventListener('abort', () => control.abort(), { once: true });

  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (token) cabeceras['Authorization'] = `Bearer ${token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${apiUrl}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
  } catch (causa) {
    // Sin red, DNS caido, CORS o timeout: nunca hubo respuesta.
    const esTimeout = control.signal.aborted;
    throw new ErrorApi(
      0,
      esTimeout ? `Tiempo de espera agotado (${timeoutMs} ms)` : `Fallo de red: ${String(causa)}`,
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    const detalle = await leerApiError(respuesta);
    throw new ErrorApi(
      respuesta.status,
      detalle?.message ?? `${respuesta.status} ${respuesta.statusText}`,
      detalle,
    );
  }

  if (respuesta.status === 204) return null;

  return (await respuesta.json()) as T;
}

/** Atajos por verbo, para que las pantallas se lean cortas. */
export const apiClient = {
  get: <T>(ruta: string, opciones?: Omit<OpcionesPeticion, 'metodo' | 'cuerpo'>) =>
    peticion<T>(ruta, { ...opciones, metodo: 'GET' }),

  post: <T>(ruta: string, cuerpo?: unknown, opciones?: Omit<OpcionesPeticion, 'metodo' | 'cuerpo'>) =>
    peticion<T>(ruta, { ...opciones, metodo: 'POST', cuerpo }),

  delete: <T>(ruta: string, opciones?: Omit<OpcionesPeticion, 'metodo' | 'cuerpo'>) =>
    peticion<T>(ruta, { ...opciones, metodo: 'DELETE' }),
};
