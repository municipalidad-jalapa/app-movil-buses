// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePanelConductor } from './usePanelConductor';
import { useRutas } from './useRutas';
import { obtenerReservasParada } from '../core/reservas';
import { ErrorApi } from '../core/errores';
import type { Ruta } from '../core/tipos';
import { configurarProveedorDeToken, proveedorDeTokenLocalStorage } from '../core/apiClient';

vi.mock('./useRutas', () => ({
  useRutas: vi.fn(),
}));

vi.mock('../core/reservas', () => ({
  obtenerReservasParada: vi.fn(),
}));

function unaRuta(sobrescribir: Partial<Ruta> = {}): Ruta {
  return {
    id: 1,
    nombre: 'Ruta Centro',
    activa: true,
    paradas: [
      { id: 20, nombre: 'Parque Central', latitud: 14.63, longitud: -89.98, orden: 2 },
      { id: 10, nombre: 'Terminal', latitud: 14.64, longitud: -89.99, orden: 1 },
      { id: 30, nombre: 'Mercado', latitud: 14.62, longitud: -89.97, orden: 3 },
    ],
    trazado: [],
    ...sobrescribir,
  };
}

function useRutasListo(rutaActiva: Ruta | null) {
  vi.mocked(useRutas).mockReturnValue({
    rutas: rutaActiva ? [rutaActiva] : [],
    rutaActiva,
    cargando: false,
    error: null,
    reintentar: vi.fn(),
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  configurarProveedorDeToken(proveedorDeTokenLocalStorage);
  localStorage.clear();
});

describe('usePanelConductor', () => {
  it('sin JWT de conductor, la sesion es invalida (criterio 6)', () => {
    useRutasListo(null);

    const { result } = renderHook(() => usePanelConductor());

    expect(result.current.sesionValida).toBe(false);
  });

  it('lista las paradas en el orden del recorrido, no como llegan del catalogo (criterio 1)', async () => {
    configurarProveedorDeToken({ obtenerToken: () => 'jwt-conductor' });
    useRutasListo(unaRuta());
    vi.mocked(obtenerReservasParada).mockImplementation(async (paradaId: number) => ({
      paradaId,
      activas: paradaId,
      reservas: [],
    }));

    const { result } = renderHook(() => usePanelConductor());

    expect(result.current.paradas.map((p) => p.parada.id)).toEqual([10, 20, 30]);
    await waitFor(() => expect(result.current.paradas.map((p) => p.activas)).toEqual([10, 20, 30]));
  });

  it('se actualiza sola cada intervalo, sin recargar (criterio 3)', async () => {
    vi.useFakeTimers();
    configurarProveedorDeToken({ obtenerToken: () => 'jwt-conductor' });
    useRutasListo(unaRuta({ paradas: [unaRuta().paradas[1]] })); // solo Terminal (id 10)

    let llamada = 0;
    vi.mocked(obtenerReservasParada).mockImplementation(async () => {
      llamada++;
      return { paradaId: 10, activas: llamada, reservas: [] };
    });

    const { result } = renderHook(() => usePanelConductor());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.paradas[0]?.activas).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.paradas[0]?.activas).toBe(2);
  });

  it('si una parada falla en un ciclo, conserva el ultimo valor conocido en vez de mostrar cero', async () => {
    vi.useFakeTimers();
    configurarProveedorDeToken({ obtenerToken: () => 'jwt-conductor' });
    useRutasListo(unaRuta({ paradas: [unaRuta().paradas[1]] })); // solo Terminal (id 10)

    let intento = 0;
    vi.mocked(obtenerReservasParada).mockImplementation(async () => {
      intento++;
      if (intento === 1) return { paradaId: 10, activas: 4, reservas: [] };
      throw new ErrorApi(500, 'El servicio no esta disponible');
    });

    const { result } = renderHook(() => usePanelConductor());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.paradas[0]?.activas).toBe(4);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(result.current.paradas[0]?.activas).toBe(4);
    expect(result.current.error).not.toBeNull();
  });

  it('si todas las paradas rechazan por falta de sesion, invalida la sesion', async () => {
    configurarProveedorDeToken({ obtenerToken: () => 'jwt-vencido' });
    useRutasListo(unaRuta());
    vi.mocked(obtenerReservasParada).mockRejectedValue(new ErrorApi(401, 'Sin sesion'));

    const { result } = renderHook(() => usePanelConductor());

    await waitFor(() => expect(result.current.sesionValida).toBe(false));
  });
});
