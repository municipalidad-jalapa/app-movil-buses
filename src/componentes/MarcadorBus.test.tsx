// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MarcadorBus, type MapaParaMarcador } from './MarcadorBus';
import type { Posicion } from '../core/tipos';

function unaPosicion(sobrescribir: Partial<Posicion> = {}): Posicion {
  return {
    latitud: 14.6335,
    longitud: -89.9885,
    velocidadKmh: 18,
    timestamp: '2026-08-19T10:00:00Z',
    vehiculo: 'BUS-01',
    ...sobrescribir,
  };
}

function mapaFalso() {
  const mover = vi.fn();
  const quitar = vi.fn();
  const mapa: MapaParaMarcador = {
    anclar: () => ({ mover, quitar }),
  };
  return { mapa, mover, quitar };
}

function mediaSinAnimacion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reduce,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MarcadorBus', () => {
  it('no pinta nada si aun no hay posicion', () => {
    render(<MarcadorBus posicion={null} mapa={null} />);
    expect(screen.queryByRole('img', { name: 'Dónde va el bus' })).toBeNull();
  });

  it('el primer punto llega de golpe, sin interpolar', () => {
    mediaSinAnimacion(false);
    const { mapa, mover } = mapaFalso();
    render(<MarcadorBus posicion={unaPosicion()} mapa={mapa} />);

    const marca = screen.getByRole('img', { name: 'Dónde va el bus' });
    expect(marca.getAttribute('data-latitud')).toBe('14.6335');
    expect(marca.style.transform).toContain('rotate(0deg)');
    expect(mover).toHaveBeenCalledWith(-89.9885, 14.6335, 0);
  });

  it('con movimiento reducido salta al destino nuevo', () => {
    mediaSinAnimacion(true);
    const { mapa, mover } = mapaFalso();
    const { rerender } = render(<MarcadorBus posicion={unaPosicion()} mapa={mapa} />);

    rerender(
      <MarcadorBus
        posicion={unaPosicion({ latitud: 14.6435, longitud: -89.9885 })}
        mapa={mapa}
      />,
    );

    const marca = screen.getByRole('img', { name: 'Dónde va el bus' });
    expect(marca.getAttribute('data-latitud')).toBe('14.6435');
    expect(mover).toHaveBeenLastCalledWith(-89.9885, 14.6435, expect.any(Number));
  });

  it('mueve con transform, nunca con top o left', () => {
    mediaSinAnimacion(true);
    render(<MarcadorBus posicion={unaPosicion()} mapa={null} />);
    const marca = screen.getByRole('img', { name: 'Dónde va el bus' });
    expect(marca.style.top).toBe('');
    expect(marca.style.left).toBe('');
    expect(marca.style.transform).toMatch(/rotate/);
  });

  it('quita el ancla al desmontar', () => {
    mediaSinAnimacion(false);
    const { mapa, quitar } = mapaFalso();
    const { unmount } = render(<MarcadorBus posicion={unaPosicion()} mapa={mapa} />);
    unmount();
    expect(quitar).toHaveBeenCalledTimes(1);
  });

  it('interpola el segundo punto con requestAnimationFrame', () => {
    mediaSinAnimacion(false);
    const cuadros: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cuadros.push(cb);
      return cuadros.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { mapa } = mapaFalso();
    const { rerender } = render(<MarcadorBus posicion={unaPosicion()} mapa={mapa} />);

    vi.spyOn(performance, 'now').mockReturnValue(0);
    rerender(
      <MarcadorBus
        posicion={unaPosicion({ latitud: 14.6435, longitud: -89.9885 })}
        mapa={mapa}
      />,
    );

    expect(cuadros.length).toBeGreaterThan(0);
    act(() => {
      cuadros[0](500);
    });

    const marca = screen.getByRole('img', { name: 'Dónde va el bus' });
    const lat = Number(marca.getAttribute('data-latitud'));
    expect(lat).toBeGreaterThan(14.6335);
    expect(lat).toBeLessThan(14.6435);
  });

  it('ancla una sola vez aunque la posicion cambie varias veces', () => {
    mediaSinAnimacion(true);
    const mover = vi.fn();
    const quitar = vi.fn();
    const anclar = vi.fn(() => ({ mover, quitar }));
    const mapa: MapaParaMarcador = { anclar };

    const { rerender } = render(<MarcadorBus posicion={unaPosicion()} mapa={mapa} />);
    rerender(
      <MarcadorBus
        posicion={unaPosicion({ latitud: 14.64, timestamp: '2026-08-19T10:05:00Z' })}
        mapa={mapa}
      />,
    );
    rerender(
      <MarcadorBus
        posicion={unaPosicion({ latitud: 14.65, timestamp: '2026-08-19T10:10:00Z' })}
        mapa={mapa}
      />,
    );

    expect(anclar).toHaveBeenCalledTimes(1);
  });

  it('ancla el marcador aunque el mapa llegue antes que la primera posicion', () => {
    mediaSinAnimacion(true);
    const mover = vi.fn();
    const quitar = vi.fn();
    const anclar = vi.fn(() => ({ mover, quitar }));
    const mapa: MapaParaMarcador = { anclar };

    const { rerender } = render(<MarcadorBus posicion={null} mapa={mapa} />);
    rerender(<MarcadorBus posicion={unaPosicion()} mapa={mapa} />);

    expect(anclar).toHaveBeenCalledTimes(1);
  });
});
