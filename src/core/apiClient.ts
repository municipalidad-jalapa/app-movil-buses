import { config } from './config';
import { ErrorApi } from './errores';
import type { ApiError } from './tipos';

/**
 * Cliente HTTP unico de la app.
 *
 * Todo acceso al backend pasa por aca. Centraliza la URL base, el timeout,
 * los reintentos, el JWT del conductor y la traduccion de errores.
 */

/** La ruta tiene cobertura irregular: nunca dejar al usuario esperando indefinidamente. */
const TIMEOUT_MS = 10_000;
const INTENTOS_POR_DEFECTO = 3;
/** Espera inicial entre reintentos; cada intento duplica este valor. */
const BACKOFF_BASE_MS = 250;

/**
 * Clave de la sesion del conductor en localStorage (HU-129).
 * El JSON lo escribe `sesionConductor`; este cliente solo pide el JWT al proveedor.
 */
export const CLAVE_JWT_CONDUCTOR = 'ecoruta_jwt';

export interface ProveedorDeToken {
  obtenerToken(): string | null;
}

/**
 * Lectura cruda de localStorage. HU-129 sustituye este proveedor al cargar
 * `sesionConductor` (parsea el JSON y expone solo el JWT). Se deja exportado
 * para tests y como fallback si nadie configura otro.
 */
export const proveedorDeTokenLocalStorage: ProveedorDeToken = {
  obtenerToken(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(CLAVE_JWT_CONDUCTOR);
    } catch {
      return null;
    }
  },
};

let proveedorDeToken: ProveedorDeToken = proveedorDeTokenLocalStorage;
let manejador401: (() => void) | null = null;

/** Permite sustituir el lector de JWT sin reescribir el cliente (HU-129). */
export function configurarProveedorDeToken(proveedor: ProveedorDeToken): void {
  proveedorDeToken = proveedor;
}

/** Lo registra AuthProvider para cerrar sesion caducada (HU-129). */
export function configurarManejador401(manejador: (() => void) | null): void {
  manejador401 = manejador;
}

export interface OpcionesPeticion {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  /**
   * Token JWT explicito. Si no se pasa, se toma del ProveedorDeToken.
   * Las pantallas no deberian enviar esto a mano: el cliente lo adjunta solo.
   */
  token?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Cantidad de intentos ante red o 5xx. Los 4xx no se reintentan. */
  intentos?: number;
  /** Base del backoff exponencial, en milisegundos. */
  backoffBaseMs?: number;
  /** Cabeceras extra. Ej. `X-Dispositivo-Id` en las acciones sobre una reserva. */
  cabeceras?: Record<string, string>;
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

function sePuedeReintentar(error: ErrorApi, signal?: AbortSignal): boolean {
  if (signal?.aborted) return false;
  return error.esFallaDeRed || error.status >= 500;
}

function esperar(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ErrorApi(0, 'Peticion cancelada'));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new ErrorApi(0, 'Peticion cancelada'));
      },
      { once: true },
    );
  });
}

async function ejecutarPeticion<T>(ruta: string, opciones: OpcionesPeticion): Promise<T | null> {
  const { metodo = 'GET', cuerpo, token, timeoutMs = TIMEOUT_MS, signal, cabeceras: extra } = opciones;
  const tokenEfectivo = token ?? proveedorDeToken.obtenerToken();

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  // Si quien llama trae su propio signal (por ejemplo, un componente que se desmonta),
  // lo encadenamos con el del timeout.
  signal?.addEventListener('abort', () => control.abort(), { once: true });

  const cabeceras: Record<string, string> = { Accept: 'application/json', ...extra };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (tokenEfectivo) cabeceras['Authorization'] = `Bearer ${tokenEfectivo}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.apiBaseUrl}${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
  } catch (causa) {
    // Sin red, DNS caido, CORS o timeout: nunca hubo respuesta.
    if (signal?.aborted) {
      throw new ErrorApi(0, 'Peticion cancelada');
    }
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
    if (respuesta.status === 401) {
      manejador401?.();
    }
    throw new ErrorApi(
      respuesta.status,
      detalle?.message ?? `${respuesta.status} ${respuesta.statusText}`,
      detalle,
    );
  }

  if (respuesta.status === 204) return null;

  return (await respuesta.json()) as T;
}

/**
 * Hace una peticion al backend.
 *
 * Devuelve `null` en 204 sin contenido: lo necesita HU-44, donde el backend responde
 * 204 cuando todavia no hay ninguna posicion del bus (no es un error).
 *
 * Reintenta fallos de red y 5xx con backoff exponencial. Los 4xx se propagan ya.
 *
 * @throws {ErrorApi} en cualquier respuesta que no sea 2xx, y tambien si falla la red.
 */
export async function peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T | null> {
  const intentos = opciones.intentos ?? INTENTOS_POR_DEFECTO;
  const backoffBaseMs = opciones.backoffBaseMs ?? BACKOFF_BASE_MS;

  let ultimoError: ErrorApi | undefined;
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await ejecutarPeticion<T>(ruta, opciones);
    } catch (causa) {
      if (!(causa instanceof ErrorApi)) throw causa;
      ultimoError = causa;
      const esUltimo = intento === intentos;
      if (!sePuedeReintentar(causa, opciones.signal) || esUltimo) {
        throw causa;
      }
      await esperar(backoffBaseMs * 2 ** (intento - 1), opciones.signal);
    }
  }
  throw ultimoError;
}

/** Atajos por verbo, para que las pantallas se lean cortas. */
export const apiClient = {
  get: <T>(ruta: string, opciones?: Omit<OpcionesPeticion, 'metodo' | 'cuerpo'>) =>
    peticion<T>(ruta, { ...opciones, metodo: 'GET' }),

  post: <T>(ruta: string, cuerpo?: unknown, opciones?: Omit<OpcionesPeticion, 'metodo' | 'cuerpo'>) =>
    peticion<T>(ruta, { ...opciones, metodo: 'POST', cuerpo }),

  put: <T>(ruta: string, cuerpo?: unknown, opciones?: Omit<OpcionesPeticion, 'metodo' | 'cuerpo'>) =>
    peticion<T>(ruta, { ...opciones, metodo: 'PUT', cuerpo }),

  delete: <T>(ruta: string, opciones?: Omit<OpcionesPeticion, 'metodo' | 'cuerpo'>) =>
    peticion<T>(ruta, { ...opciones, metodo: 'DELETE' }),
};
