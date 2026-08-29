// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

vi.mock('../core/apiClient');

import { useEstadoDemandaConPolling, RUTA_ESTADO_DEMANDA } from './useEstadoDemandaConPolling';
import { apiClient } from '../core/apiClient';
import { ErrorApi } from '../core/errores';

const mockGet = vi.mocked(apiClient.get);

const estadoFalso = {
  totalEsperando: 7,
  umbralSalida: 10,
  faltanParaSalir: 3,
  porParada: { '12': 4, '19': 3 },
};

beforeAll(() => {
  Object.defineProperty(document, 'hidden', {
    writable: true,
    value: false,
    configurable: true,
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  mockGet.mockClear();
  mockGet.mockResolvedValue(estadoFalso);
});

afterEach(() => {
  // Desmonta el hook para que sus listeners de visibilitychange no se acumulen
  // entre pruebas (este proyecto no activa el auto-cleanup de testing-library).
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  // La prueba de "pausa" deja document.hidden en true; restablece para las demás.
  Object.defineProperty(document, 'hidden', {
    writable: true,
    value: false,
    configurable: true,
  });
});

describe('useEstadoDemandaConPolling', () => {
  it('consulta el estado inicial', async () => {
    const { result } = renderHook(() => useEstadoDemandaConPolling(15000));

    expect(result.current.cargando).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.registrosActivos).toBe(7);
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(RUTA_ESTADO_DEMANDA, expect.any(Object));
  });

  it('hace polling cada intervalo', async () => {
    renderHook(() => useEstadoDemandaConPolling(15000));

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('pausa cuando documento está oculto', async () => {
    const { result } = renderHook(() => useEstadoDemandaConPolling(15000));

    await act(async () => {
      await Promise.resolve();
    });

    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.pausadoPorVisibilidad).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(15000);
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('reanuda cuando documento es visible', async () => {
    const { result } = renderHook(() => useEstadoDemandaConPolling(15000));

    await act(async () => {
      await Promise.resolve();
    });

    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: true,
      configurable: true,
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(result.current.pausadoPorVisibilidad).toBe(true);

    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
      configurable: true,
    });
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.pausadoPorVisibilidad).toBe(false);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('maneja errores', async () => {
    const error = new ErrorApi(422, 'Error de demanda');
    mockGet.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useEstadoDemandaConPolling(15000));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe(error);
    expect(result.current.cargando).toBe(false);
  });

  it('reintentar después de error', async () => {
    const error = new ErrorApi(422, 'Error');
    mockGet.mockRejectedValueOnce(error).mockResolvedValueOnce(estadoFalso);

    const { result } = renderHook(() => useEstadoDemandaConPolling(15000));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe(error);

    act(() => {
      result.current.reintentar();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.registrosActivos).toBe(7);
    expect(result.current.error).toBeNull();
  });

  it('limpia recursos al desmontar', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

    const { unmount } = renderHook(() => useEstadoDemandaConPolling(15000));

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
