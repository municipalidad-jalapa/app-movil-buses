import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../core/apiClient';
import type { Ruta } from '../core/tipos';
import { useRutas, type EstadoRutas } from './useRutas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const rutasDePrueba: Ruta[] = [
  {
    id: 1,
    nombre: 'Ruta Centro',
    activa: false,
    paradas: [],
  },
  {
    id: 2,
    nombre: 'Ruta Terminal',
    activa: true,
    paradas: [
      { id: 10, nombre: 'Parque central', latitud: 14.6349, longitud: -89.9882, orden: 1 },
    ],
  },
];

function Observador({ alCambiar }: { alCambiar: (estado: EstadoRutas) => void }) {
  alCambiar(useRutas());
  return null;
}

describe('useRutas', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(() => {
    act(() => renderer?.unmount());
    vi.restoreAllMocks();
  });

  it('devuelve la ruta activa y sus paradas', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(rutasDePrueba);
    let estado: EstadoRutas | undefined;

    await act(async () => {
      renderer = create(<Observador alCambiar={(actual) => { estado = actual; }} />);
      await Promise.resolve();
    });

    expect(estado?.cargando).toBe(false);
    expect(estado?.error).toBeNull();
    expect(estado?.rutas).toEqual(rutasDePrueba);
    expect(estado?.rutaActiva).toEqual(rutasDePrueba[1]);
    expect(estado?.paradas).toEqual(rutasDePrueba[1].paradas);
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/rutas', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('expone una lista vacia cuando el backend no devuelve rutas', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(null);
    let estado: EstadoRutas | undefined;

    await act(async () => {
      renderer = create(<Observador alCambiar={(actual) => { estado = actual; }} />);
      await Promise.resolve();
    });

    expect(estado?.cargando).toBe(false);
    expect(estado?.rutas).toEqual([]);
    expect(estado?.rutaActiva).toBeNull();
    expect(estado?.paradas).toEqual([]);
  });

  it('no selecciona una ruta cuando todas estan inactivas', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([
      { id: 3, nombre: 'Ruta inactiva', activa: false, paradas: [] },
    ]);
    let estado: EstadoRutas | undefined;

    await act(async () => {
      renderer = create(<Observador alCambiar={(actual) => { estado = actual; }} />);
      await Promise.resolve();
    });

    expect(estado?.cargando).toBe(false);
    expect(estado?.error).toBeNull();
    expect(estado?.rutaActiva).toBeNull();
    expect(estado?.paradas).toEqual([]);
  });

  it('expone el error y permite reintentar la consulta', async () => {
    const getRutas = vi.spyOn(apiClient, 'get')
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce(rutasDePrueba);
    let estado: EstadoRutas | undefined;

    await act(async () => {
      renderer = create(<Observador alCambiar={(actual) => { estado = actual; }} />);
      await Promise.resolve();
    });
    expect(estado?.cargando).toBe(false);
    expect(estado?.error).toEqual(new Error('sin red'));

    await act(async () => {
      estado?.reintentar();
      await Promise.resolve();
    });

    expect(estado?.cargando).toBe(false);
    expect(estado?.error).toBeNull();
    expect(estado?.rutaActiva?.id).toBe(2);
    expect(getRutas).toHaveBeenCalledTimes(2);
  });
});