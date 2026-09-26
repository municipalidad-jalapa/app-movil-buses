// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { obtenerRutaConductor } from '../../core/panelConductor';
import { ElegirRuta } from './ElegirRuta';

vi.mock('../../core/panelConductor', async (original) => ({
  ...(await original<typeof import('../../core/panelConductor')>()),
  obtenerRutaConductor: vi.fn(),
  elegirRutaConductor: vi.fn(),
}));

beforeEach(() => vi.mocked(obtenerRutaConductor).mockReset());
afterEach(cleanup);

describe('Elegir la ruta del conductor', () => {
  it('marca la ruta que ya maneja', async () => {
    vi.mocked(obtenerRutaConductor).mockResolvedValue({
      rutaId: 2,
      rutaNombre: 'RUTA SECUNDARIA',
      rutas: [
        { id: 1, nombre: 'RUTA PRINCIPAL' },
        { id: 2, nombre: 'RUTA SECUNDARIA' },
      ],
    });
    render(<ElegirRuta onElegida={vi.fn()} />);

    const actual = await screen.findByRole('button', { name: /RUTA SECUNDARIA/ });
    expect(actual.getAttribute('aria-pressed')).toBe('true');
    expect(actual.textContent).toContain('La que manejás');
    expect(screen.getByRole('button', { name: /RUTA PRINCIPAL/ }).getAttribute('aria-pressed')).toBe('false');
  });

  it('sin rutas publicadas lo dice en vez de mostrar una lista vacia', async () => {
    vi.mocked(obtenerRutaConductor).mockResolvedValue({ rutaId: null, rutaNombre: null, rutas: [] });
    render(<ElegirRuta onElegida={vi.fn()} />);
    expect(await screen.findByText(/Todavía no hay rutas publicadas/)).toBeTruthy();
  });
});
