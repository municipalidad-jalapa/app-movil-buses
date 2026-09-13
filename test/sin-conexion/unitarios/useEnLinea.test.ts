// @vitest-environment jsdom
//
// Historia "zona sin señal" (artboard 09, DESIGN.md §7 `sin-conexion`).
// Prueba src/hooks/useEnLinea.ts: quien decide si se muestra AvisoSinConexion.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { useEnLinea } from '../../../src/hooks/useEnLinea';

function forzarOnLine(valor: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: valor, configurable: true });
}

afterEach(() => {
  cleanup();
  forzarOnLine(true);
});

describe('useEnLinea', () => {
  it('arranca en linea cuando navigator.onLine no dice lo contrario', () => {
    forzarOnLine(true);
    const { result } = renderHook(() => useEnLinea());
    expect(result.current).toBe(true);
  });

  it('arranca sin conexion si navigator.onLine ya es false al montar', () => {
    forzarOnLine(false);
    const { result } = renderHook(() => useEnLinea());
    expect(result.current).toBe(false);
  });

  it('pasa a sin conexion cuando el navegador dispara "offline"', () => {
    const { result } = renderHook(() => useEnLinea());
    expect(result.current).toBe(true);

    act(() => {
      forzarOnLine(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('vuelve a en linea cuando el navegador dispara "online"', () => {
    forzarOnLine(false);
    const { result } = renderHook(() => useEnLinea());
    expect(result.current).toBe(false);

    act(() => {
      forzarOnLine(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });
});
