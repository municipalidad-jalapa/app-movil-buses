// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePanelConductor } from './usePanelConductor';
import { apiClient } from '../core/apiClient';
import { ErrorApi } from '../core/errores';
import { INTERVALO_ACTUALIZACION_DATOS_MS } from '../core/frecuenciaActualizacion';
import type { Ruta, RutaEta, ReservasActivasPorParada } from '../core/tipos';

vi.mock('../core/apiClient', () => ({
  apiClient: { get: vi.fn() },
}));

const RUTA: Ruta = {
  id: 7,
  nombre: 'Ruta Centro',
  activa: true,
  trazado: [],
  paradas: [
    { id: 1, nombre: 'Parque Central', latitud: 14.6335, longitud: -89.9885, orden: 1 },
    { id: 2, nombre: 'Mercado', latitud: 14.635, longitud: -89.99, orden: 2 },
  ],
};

const ETA: RutaEta = {
  rutaId: 7,
  calculadoEn: '2026-09-08T10:00:00Z',
  paradas: [
    { paradaId: 1, confianza: 'alta', etaMinMinutos: 4, etaMaxMinutos: 4, proximaSalida: null, atendida: false },
    { paradaId: 2, confianza: 'media', etaMinMinutos: 8, etaMaxMinutos: 11, proximaSalida: null, atendida: false },
  ],
};

const RESERVAS: ReservasActivasPorParada = { rutaId: 7, porParada: { '1': 2, '2': 5 } };

function mockearApi(opciones: {
  rutas?: Ruta[] | ErrorApi;
  eta?: RutaEta | ErrorApi;
  reservas?: ReservasActivasPorParada | ErrorApi;
}) {
  vi.mocked(apiClient.get).mockImplementation(async (ruta: string) => {
    if (ruta === '/api/v1/rutas') {
      if (opciones.rutas instanceof ErrorApi) throw opciones.rutas;
      return opciones.rutas ?? [RUTA];
    }
    if (ruta === `/api/v1/rutas/${RUTA.id}/eta`) {
      if (opciones.eta instanceof ErrorApi) throw opciones.eta;
      return opciones.eta ?? ETA;
    }
    if (ruta === `/api/v1/rutas/${RUTA.id}/reservas/activas`) {
      if (opciones.reservas instanceof ErrorApi) throw opciones.reservas;
      return opciones.reservas ?? RESERVAS;
    }
    throw new Error(`ruta inesperada: ${ruta}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePanelConductor', () => {
  it('pide el ETA y las reservas de la ruta activa de la sesion, no de una elegida a mano', async () => {
    mockearApi({});

    const { result } = renderHook(() => usePanelConductor());

    await waitFor(() => expect(result.current.filas).toHaveLength(2));

    expect(apiClient.get).toHaveBeenCalledWith(
      `/api/v1/rutas/${RUTA.id}/eta`,
      expect.anything(),
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      `/api/v1/rutas/${RUTA.id}/reservas/activas`,
      expect.anything(),
    );
  });

  it('combina ETA y reservas por parada en las filas del panel', async () => {
    mockearApi({});

    const { result } = renderHook(() => usePanelConductor());

    await waitFor(() => expect(result.current.filas).toHaveLength(2));

    expect(result.current.filas[0]).toMatchObject({
      paradaId: 1,
      reservasActivas: 2,
      eta: { tipo: 'exacto', minutos: 4 },
    });
    expect(result.current.filas[1]).toMatchObject({
      paradaId: 2,
      reservasActivas: 5,
      eta: { tipo: 'rango', minMinutos: 8, maxMinutos: 11 },
    });
  });

  it('registra cuando llego el ultimo dato valido', async () => {
    mockearApi({});

    const { result } = renderHook(() => usePanelConductor());

    await waitFor(() => expect(result.current.actualizadoEn).toBeInstanceOf(Date));
  });

  it('un 403 (ruta que no es del conductor) llega como error, sin datos enganosos', async () => {
    const error403 = new ErrorApi(403, 'No tienes permiso para hacer esto.');
    mockearApi({ eta: error403 });

    const { result } = renderHook(() => usePanelConductor());

    await waitFor(() => expect(result.current.error).toBe(error403));
    // Nunca se muestra un ETA a medio calcular: sin datos validos, cada fila
    // queda en 'no-disponible', nunca con un numero.
    expect(result.current.filas.every((f) => f.eta.tipo === 'no-disponible')).toBe(true);
  });

  it('vuelve a consultar a la misma cadencia que usa la pantalla del pasajero', async () => {
    mockearApi({});

    renderHook(() => usePanelConductor());

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/rutas/${RUTA.id}/eta`, expect.anything()),
    );
    const llamadasIniciales = vi.mocked(apiClient.get).mock.calls.length;

    await vi.advanceTimersByTimeAsync(INTERVALO_ACTUALIZACION_DATOS_MS);

    await waitFor(() =>
      expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(llamadasIniciales),
    );
  });
});
