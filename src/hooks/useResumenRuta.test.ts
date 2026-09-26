// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { apiClient } from '../core/apiClient';
import { REFRESCO_RESUMEN_MS, useResumenRuta } from './useResumenRuta';

vi.mock('../core/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const RESUMEN = {
  rutaId: 1,
  reservasActivas: {
    total: 5,
    porParada: [{ paradaId: 2, reservasActivas: 4 }],
  },
};

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.get).mockResolvedValue(RESUMEN);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useResumenRuta', () => {
  it('consulta al abrir y expone el conteo por parada', async () => {
    const { result } = renderHook(() => useResumenRuta(1));

    await waitFor(() => expect(result.current.esperandoPorParada.get(2)).toBe(4));
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/rutas/1/resumen', expect.any(Object));
  });

  it('refrescar() dispara una consulta inmediata', async () => {
    const { result } = renderHook(() => useResumenRuta(1));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.refrescar();
    });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  });

  it('actualiza automáticamente al cumplirse REFRESCO_RESUMEN_MS', async () => {
    vi.useFakeTimers();
    renderHook(() => useResumenRuta(1));

    await act(async () => {
      await Promise.resolve();
    });
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESCO_RESUMEN_MS);
    });
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('cancela el temporizador al desmontar', async () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useResumenRuta(1));

    await act(async () => {
      await Promise.resolve();
    });
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESCO_RESUMEN_MS * 2);
    });
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
