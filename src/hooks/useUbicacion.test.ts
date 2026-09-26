// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ubicacionSimulada, useUbicacion } from './useUbicacion';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useUbicacion', () => {
  it('obtiene latitud y longitud del navegador', async () => {
    const getCurrentPosition = vi.fn((exito: PositionCallback) => {
      exito({
        coords: {
          latitude: 14.6335,
          longitude: -89.9885,
        },
      } as GeolocationPosition);
    });

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition,
      },
    });

    const { result } = renderHook(() => useUbicacion());

    let ubicacion = null;

    await act(async () => {
      ubicacion = await result.current.solicitarUbicacion();
    });

    expect(ubicacion).toEqual({
      latitud: 14.6335,
      longitud: -89.9885,
    });

    expect(result.current.error).toBeNull();
  });

  it('muestra un mensaje claro cuando el usuario niega el permiso', async () => {
    const getCurrentPosition = vi.fn(
      (_exito: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          message: 'Permission denied',
        } as GeolocationPositionError);
      },
    );

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition,
      },
    });

    const { result } = renderHook(() => useUbicacion());

    await act(async () => {
      await result.current.solicitarUbicacion();
    });

    await waitFor(() =>
      expect(result.current.error).toContain(
        'Habilita el permiso de ubicación',
      ),
    );

    expect(result.current.ubicacion).toBeNull();
  });

  it('informa cuando el navegador no soporta geolocalizacion', async () => {
    vi.stubGlobal('navigator', {});

    const { result } = renderHook(() => useUbicacion());

    await act(async () => {
      await result.current.solicitarUbicacion();
    });

    expect(result.current.error).toBe(
      'Este navegador no permite obtener tu ubicación.',
    );
  });
});

describe('ubicacionSimulada (QA, solo desarrollo)', () => {
  it('en desarrollo devuelve el punto configurado', () => {
    expect(ubicacionSimulada({ DEV: true, VITE_UBICACION_SIMULADA: ' 14.6326 , -89.9871 ' })).toEqual({
      latitud: 14.6326,
      longitud: -89.9871,
    });
  });

  it('en un build de produccion se ignora aunque la variable venga puesta', () => {
    expect(ubicacionSimulada({ DEV: false, VITE_UBICACION_SIMULADA: '14.6326,-89.9871' })).toBeNull();
  });

  it('un valor mal escrito no inventa una ubicacion', () => {
    expect(ubicacionSimulada({ DEV: true, VITE_UBICACION_SIMULADA: 'jalapa' })).toBeNull();
    expect(ubicacionSimulada({ DEV: true, VITE_UBICACION_SIMULADA: '200,10' })).toBeNull();
    expect(ubicacionSimulada({ DEV: true })).toBeNull();
  });
});
