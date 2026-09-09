import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_JWT_CONDUCTOR,
  apiClient,
  configurarManejador401,
  configurarProveedorDeToken,
  peticion,
  proveedorDeTokenLocalStorage,
} from './apiClient';
import { ErrorApi } from './errores';

/** Respuesta minima que imita lo que devuelve fetch. */
function respuestaFalsa(status: number, cuerpo?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => {
      if (cuerpo === undefined) throw new Error('sin cuerpo');
      return cuerpo;
    },
  } as Response;
}

function fetchQueNuncaResponde() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      );
    });
  });
}

function cabecerasDe(fetchMock: ReturnType<typeof vi.fn>, llamada = 0): Record<string, string> {
  const init = fetchMock.mock.calls[llamada]?.[1] as RequestInit | undefined;
  return (init?.headers ?? {}) as Record<string, string>;
}

describe('peticion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    configurarProveedorDeToken(proveedorDeTokenLocalStorage);
    configurarManejador401(null);
  });

  it('devuelve el cuerpo ya parseado en una respuesta correcta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(200, [{ id: 1, nombre: 'Ruta Centro' }])));

    const rutas = await peticion<{ id: number; nombre: string }[]>('/api/v1/rutas');

    expect(rutas).toEqual([{ id: 1, nombre: 'Ruta Centro' }]);
  });

  it('devuelve null en 204 porque no es un error (HU-44 responde asi sin posicion)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(204)));

    expect(await peticion('/api/v1/telemetria/posicion')).toBeNull();
  });

  it('convierte un ApiError 422 en ErrorApi y conserva el mensaje del backend', async () => {
    const apiError = {
      timestamp: '2026-08-11T00:00:00Z',
      status: 422,
      error: 'Unprocessable Entity',
      message: 'Debes estar a menos de 150 m de la parada para registrarte',
      path: '/api/v1/reservas',
    };
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(422, apiError)));

    const fallo = await peticion('/api/v1/reservas', { metodo: 'POST' }).catch((e) => e);

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect((fallo as ErrorApi).status).toBe(422);
    // La regla de negocio se muestra tal cual: ya viene redactada para el pasajero
    expect((fallo as ErrorApi).mensajeParaUsuario()).toBe(
      'Debes estar a menos de 150 m de la parada para registrarte',
    );
  });

  it('traduce una falla de red a ErrorApi con status 0 y mensaje entendible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const fallo = (await peticion('/api/v1/rutas', { backoffBaseMs: 0 }).catch((e) => e)) as ErrorApi;

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect(fallo.esFallaDeRed).toBe(true);
    expect(fallo.mensajeParaUsuario()).toBe(
      'Sin datos nuevos: revisa tu conexion e intenta de nuevo.',
    );
  });

  it('usa un mensaje generico cuando el error 500 no trae cuerpo ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(500)));

    const fallo = (await peticion('/api/v1/rutas', { backoffBaseMs: 0 }).catch((e) => e)) as ErrorApi;

    expect(fallo.status).toBe(500);
    expect(fallo.mensajeParaUsuario()).toBe(
      'El servicio no esta disponible en este momento. Intenta mas tarde.',
    );
  });
});

describe('reintentos', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    configurarProveedorDeToken(proveedorDeTokenLocalStorage);
    configurarManejador401(null);
  });

  it('reintenta un 5xx y devuelve el cuerpo cuando un intento posterior funciona', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respuestaFalsa(500))
      .mockResolvedValueOnce(respuestaFalsa(500))
      .mockResolvedValueOnce(respuestaFalsa(200, { id: 7 }));
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await peticion<{ id: number }>('/api/v1/rutas', { backoffBaseMs: 0 });

    expect(resultado).toEqual({ id: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reintenta un fallo de red y se rinde despues de 3 intentos', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    const fallo = (await peticion('/api/v1/rutas', { backoffBaseMs: 0 }).catch((e) => e)) as ErrorApi;

    expect(fallo.esFallaDeRed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('no reintenta un 4xx: propaga el error en el primer intento', async () => {
    const fetchMock = vi.fn(async () => respuestaFalsa(404));
    vi.stubGlobal('fetch', fetchMock);

    const fallo = (await peticion('/api/v1/rutas', { backoffBaseMs: 0 }).catch((e) => e)) as ErrorApi;

    expect(fallo.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no reintenta un 400 ni un 422', async () => {
    const fetch400 = vi.fn(async () => respuestaFalsa(400));
    vi.stubGlobal('fetch', fetch400);
    await peticion('/api/v1/rutas', { backoffBaseMs: 0 }).catch(() => undefined);
    expect(fetch400).toHaveBeenCalledTimes(1);

    const fetch422 = vi.fn(async () => respuestaFalsa(422, { status: 422, message: 'fuera de geocerca' }));
    vi.stubGlobal('fetch', fetch422);
    await peticion('/api/v1/reservas', { metodo: 'POST', backoffBaseMs: 0 }).catch(() => undefined);
    expect(fetch422).toHaveBeenCalledTimes(1);
  });

  it('espera con backoff exponencial entre intentos de red', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(respuestaFalsa(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const pendiente = peticion('/api/v1/rutas', { backoffBaseMs: 250 });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(249);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pendiente).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

describe('timeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    configurarProveedorDeToken(proveedorDeTokenLocalStorage);
    configurarManejador401(null);
  });

  it('aborta la peticion al agotar el tiempo de espera', async () => {
    const fetchMock = fetchQueNuncaResponde();
    vi.stubGlobal('fetch', fetchMock);

    const fallo = (await peticion('/api/v1/rutas', {
      timeoutMs: 20,
      intentos: 1,
    }).catch((e) => e)) as ErrorApi;

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect(fallo.esFallaDeRed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toHaveProperty('signal');
  });

  it('trata el timeout como fallo de red y lo reintenta', async () => {
    const fetchMock = fetchQueNuncaResponde();
    vi.stubGlobal('fetch', fetchMock);

    const fallo = (await peticion('/api/v1/rutas', {
      timeoutMs: 15,
      backoffBaseMs: 0,
    }).catch((e) => e)) as ErrorApi;

    expect(fallo.esFallaDeRed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('Authorization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    configurarProveedorDeToken(proveedorDeTokenLocalStorage);
    configurarManejador401(null);
  });

  it('adjunta Bearer cuando el proveedor tiene un token', async () => {
    configurarProveedorDeToken({ obtenerToken: () => 'jwt-conductor' });
    const fetchMock = vi.fn(async () => respuestaFalsa(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await peticion('/api/v1/conductor/estado');

    expect(cabecerasDe(fetchMock).Authorization).toBe('Bearer jwt-conductor');
  });

  it('no envia Authorization cuando no hay sesion', async () => {
    configurarProveedorDeToken({ obtenerToken: () => null });
    const fetchMock = vi.fn(async () => respuestaFalsa(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await peticion('/api/v1/rutas');

    expect(cabecerasDe(fetchMock).Authorization).toBeUndefined();
  });

  it('lee el JWT temporal de localStorage bajo ecoruta_jwt', async () => {
    const memoria: Record<string, string> = { [CLAVE_JWT_CONDUCTOR]: 'token-local' };
    vi.stubGlobal('localStorage', {
      getItem: (clave: string) => memoria[clave] ?? null,
    });
    const fetchMock = vi.fn(async () => respuestaFalsa(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await peticion('/api/v1/conductor/estado');

    expect(cabecerasDe(fetchMock).Authorization).toBe('Bearer token-local');
  });
});

describe('manejador 401', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    configurarProveedorDeToken(proveedorDeTokenLocalStorage);
    configurarManejador401(null);
  });

  it('invoca el manejador configurado y sigue lanzando ErrorApi', async () => {
    const manejador = vi.fn();
    configurarManejador401(manejador);
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(401)));

    const fallo = (await peticion('/api/v1/conductor/estado', { intentos: 1 }).catch((e) => e)) as ErrorApi;

    expect(manejador).toHaveBeenCalledTimes(1);
    expect(fallo).toBeInstanceOf(ErrorApi);
    expect(fallo.status).toBe(401);
  });

  it('no invoca el manejador en otros 4xx', async () => {
    const manejador = vi.fn();
    configurarManejador401(manejador);
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(404)));

    await peticion('/api/v1/rutas', { intentos: 1 }).catch(() => undefined);

    expect(manejador).not.toHaveBeenCalled();
  });
});

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    configurarProveedorDeToken(proveedorDeTokenLocalStorage);
    configurarManejador401(null);
  });

  it('expone put y envia el verbo PUT', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => respuestaFalsa(200, { id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.put('/api/v1/conductor/estado', { activo: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT' });
  });
});
