import { afterEach, describe, expect, it, vi } from 'vitest';
import { obtenerReservasParada, rutaReservasParada } from './reservas';
import { ErrorApi } from './errores';

/** Imita lo que devuelve fetch, igual que en apiClient.test.ts. */
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

afterEach(() => vi.unstubAllGlobals());

describe('rutaReservasParada', () => {
  it('arma la ruta del contrato con el id de la parada', () => {
    expect(rutaReservasParada(7)).toBe('/api/v1/paradas/7/reservas');
  });
});

describe('obtenerReservasParada', () => {
  it('consulta la parada correcta y devuelve activas y reservas', async () => {
    const cuerpo = {
      paradaId: 7,
      activas: 3,
      reservas: [
        { id: 1, expiraEn: '2026-08-27T10:00:00Z' },
        { id: 2, expiraEn: '2026-08-27T10:05:00Z' },
        { id: 3, expiraEn: '2026-08-27T10:10:00Z' },
      ],
    };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => respuestaFalsa(200, cuerpo));
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await obtenerReservasParada(7);

    expect(resultado).toEqual(cuerpo);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/paradas/7/reservas');
  });

  it('propaga el rechazo del backend como ErrorApi (sin sesion de conductor)', async () => {
    const apiError = {
      timestamp: '2026-08-27T10:00:00Z',
      status: 401,
      error: 'Unauthorized',
      message: 'Sin sesion',
      path: '/api/v1/paradas/7/reservas',
    };
    vi.stubGlobal('fetch', vi.fn(async () => respuestaFalsa(401, apiError)));

    const fallo = await obtenerReservasParada(7).catch((e) => e);

    expect(fallo).toBeInstanceOf(ErrorApi);
    expect((fallo as ErrorApi).status).toBe(401);
  });
});
