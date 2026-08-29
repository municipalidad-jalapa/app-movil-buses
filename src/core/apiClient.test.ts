import { afterEach, describe, expect, it, vi } from 'vitest';
import { peticion } from './apiClient';
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

describe('peticion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('usa datos simulados cuando la ruta de demanda no existe aun en el backend', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(404, { message: 'Not Found' })));

    const demanda = await peticion('/api/v1/demanda/estado');

    expect(demanda).toEqual({
      totalEsperando: 7,
      umbralSalida: 10,
      faltanParaSalir: 3,
      porParada: { 'parada-1': 7 },
    });
  });

  it('convierte un ApiError 422 en ErrorApi y conserva el mensaje del backend', async () => {
    const apiError = {
      timestamp: '2026-08-11T00:00:00Z',
      status: 422,
      error: 'Unprocessable Entity',
      message: 'Debes estar a menos de 150 m de la parada para registrarte',
      path: '/api/v1/demanda/registros',
    };
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(422, apiError)));

    const fallo = await peticion('/api/v1/demanda/registros', { metodo: 'POST' }).catch((e) => e);

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect((fallo as ErrorApi).status).toBe(422);
    // La regla de negocio se muestra tal cual: ya viene redactada para el pasajero
    expect((fallo as ErrorApi).mensajeParaUsuario()).toBe(
      'Debes estar a menos de 150 m de la parada para registrarte',
    );
  });

  it('traduce una falla de red a ErrorApi con status 0 y mensaje entendible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    const fallo = (await peticion('/api/v1/rutas').catch((e) => e)) as ErrorApi;

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect(fallo.esFallaDeRed).toBe(true);
    expect(fallo.mensajeParaUsuario()).toBe(
      'No pudimos conectar. Revisa tu conexion e intenta de nuevo.',
    );
  });

  it('usa un mensaje generico cuando el error 500 no trae cuerpo ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(500)));

    const fallo = (await peticion('/api/v1/rutas').catch((e) => e)) as ErrorApi;

    expect(fallo.status).toBe(500);
    expect(fallo.mensajeParaUsuario()).toBe(
      'El servicio no esta disponible en este momento. Intenta mas tarde.',
    );
  });
});
