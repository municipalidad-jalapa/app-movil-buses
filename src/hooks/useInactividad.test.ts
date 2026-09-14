// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInactividad } from './useInactividad';

describe('useInactividad (SCRUM-173, criterio 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const minutos = (n: number) => n * 60_000;

  it('sin actividad avisa un minuto antes y cierra al vencer', () => {
    const alCerrar = vi.fn();
    const alRenovar = vi.fn();
    const expiraEnMs = Date.now() + minutos(30);
    const { result } = renderHook(() => useInactividad({ expiraEnMs, alRenovar, alCerrar }));

    act(() => vi.advanceTimersByTime(minutos(28) + 59_000));
    expect(result.current.segundosRestantes).toBeNull();

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.segundosRestantes).toBe(59);

    act(() => vi.advanceTimersByTime(60_000));
    expect(alCerrar).toHaveBeenCalledOnce();
    expect(alRenovar).not.toHaveBeenCalled();
  });

  it('la actividad renueva la sesion, como mucho una vez por minuto', () => {
    const alRenovar = vi.fn();
    const expiraEnMs = Date.now() + minutos(30);
    renderHook(() => useInactividad({ expiraEnMs, alRenovar, alCerrar: vi.fn() }));

    act(() => vi.advanceTimersByTime(30_000));
    window.dispatchEvent(new Event('keydown'));
    expect(alRenovar).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(31_000));
    window.dispatchEvent(new Event('keydown'));
    window.dispatchEvent(new Event('mousemove'));
    expect(alRenovar).toHaveBeenCalledOnce();
  });

  it('durante el aviso mover el raton no alcanza: hay que elegir seguir', () => {
    const alRenovar = vi.fn();
    const expiraEnMs = Date.now() + minutos(2);
    const { result } = renderHook(() => useInactividad({ expiraEnMs, alRenovar, alCerrar: vi.fn() }));

    act(() => vi.advanceTimersByTime(minutos(1) + 5_000));
    expect(result.current.segundosRestantes).not.toBeNull();
    window.dispatchEvent(new Event('mousemove'));
    expect(alRenovar).not.toHaveBeenCalled();

    act(() => result.current.seguir());
    expect(alRenovar).toHaveBeenCalledOnce();
    expect(result.current.segundosRestantes).toBeNull();
  });
});
