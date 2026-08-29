// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEstadoDemanda, RUTA_ESTADO_DEMANDA } from './useEstadoDemanda';
import { ErrorApi } from '../core/errores';

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

const estadoFalso = {
  totalEsperando: 7,
  umbralSalida: 10,
  faltanParaSalir: 3,
  porParada: { '12': 4, '19': 3 },
};

afterEach(() => vi.unstubAllGlobals());

describe('useEstadoDemanda', () => {
  it('consulta el estado y expone registros activos, umbral y faltantes', async () => {
    const fetchMock = vi.fn(async () => respuestaFalsa(200, estadoFalso));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEstadoDemanda());

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.registrosActivos).toBe(7));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(RUTA_ESTADO_DEMANDA),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.current.umbral).toBe(10);
    expect(result.current.faltantes).toBe(3);
    expect(result.current.porParada).toEqual({ '12': 4, '19': 3 });
    expect(result.current.estadoDemanda).toEqual(estadoFalso);
    expect(result.current.error).toBeNull();
  });

  it('expone ErrorApi para que la pantalla use el traductor existente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        respuestaFalsa(422, {
          timestamp: '2026-08-27T10:00:00Z',
          status: 422,
          error: 'Unprocessable Entity',
          message: 'No se pudo consultar la demanda',
          path: RUTA_ESTADO_DEMANDA,
        }),
      ),
    );

    const { result } = renderHook(() => useEstadoDemanda());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(ErrorApi));
    expect(result.current.cargando).toBe(false);
    expect(result.current.error?.mensajeParaUsuario()).toBe(
      'No se pudo consultar la demanda',
    );
    expect(result.current.registrosActivos).toBeNull();
  });

  it('permite reintentar la consulta después de un fallo', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respuestaFalsa(422))
      .mockResolvedValueOnce(respuestaFalsa(200, estadoFalso));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useEstadoDemanda());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ErrorApi));

    act(() => result.current.reintentar());

    await waitFor(() => expect(result.current.registrosActivos).toBe(7));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('no actualiza el estado cuando la consulta termina después de desmontar', async () => {
    let resolver!: (respuesta: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolver = resolve; })));

    const { unmount } = renderHook(() => useEstadoDemanda());
    unmount();

    await act(async () => resolver(respuestaFalsa(200, estadoFalso)));
  });
});
