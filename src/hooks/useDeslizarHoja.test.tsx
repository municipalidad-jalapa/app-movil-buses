// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useDeslizarHoja } from './useDeslizarHoja';

function Hoja({ alSubir, alBajar }: { alSubir?: () => void; alBajar?: () => void }) {
  const ref = useDeslizarHoja({ alSubir, alBajar });
  return (
    <section ref={ref} data-testid="hoja">
      <button type="button">Botón</button>
    </section>
  );
}

function deslizar(el: Element, desdeY: number, hastaY: number, duracionMs = 300) {
  let ahora = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => ahora);
  fireEvent.touchStart(el, { touches: [{ clientX: 100, clientY: desdeY }] });
  fireEvent.touchMove(el, { touches: [{ clientX: 100, clientY: (desdeY + hastaY) / 2 }] });
  fireEvent.touchMove(el, { touches: [{ clientX: 100, clientY: hastaY }] });
  ahora += duracionMs;
  fireEvent.touchEnd(el, { touches: [] });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useDeslizarHoja', () => {
  it('deslizar hacia abajo achica o cierra', () => {
    const alBajar = vi.fn();
    render(<Hoja alBajar={alBajar} />);
    deslizar(screen.getByTestId('hoja'), 100, 220);
    expect(alBajar).toHaveBeenCalledTimes(1);
  });

  it('deslizar hacia arriba abre', () => {
    const alSubir = vi.fn();
    render(<Hoja alSubir={alSubir} />);
    deslizar(screen.getByTestId('hoja'), 300, 180);
    expect(alSubir).toHaveBeenCalledTimes(1);
  });

  it('un movimiento corto y lento no cuenta', () => {
    const alBajar = vi.fn();
    render(<Hoja alBajar={alBajar} />);
    deslizar(screen.getByTestId('hoja'), 100, 120, 2000);
    expect(alBajar).not.toHaveBeenCalled();
  });

  it('un deslizamiento horizontal no mueve la hoja', () => {
    const alBajar = vi.fn();
    render(<Hoja alBajar={alBajar} />);
    const hoja = screen.getByTestId('hoja');
    fireEvent.touchStart(hoja, { touches: [{ clientX: 0, clientY: 100 }] });
    fireEvent.touchMove(hoja, { touches: [{ clientX: 150, clientY: 130 }] });
    fireEvent.touchEnd(hoja, { touches: [] });
    expect(alBajar).not.toHaveBeenCalled();
  });
});
