// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PanelConductor } from './PanelConductor';
import { usePanelConductor } from '../hooks/usePanelConductor';
import { ErrorApi } from '../core/errores';
import type { Ruta } from '../core/tipos';

vi.mock('../hooks/usePanelConductor', () => ({
  usePanelConductor: vi.fn(),
}));

function ruta(): Ruta {
  return {
    id: 1,
    nombre: 'Ruta Centro',
    activa: true,
    paradas: [{ id: 10, nombre: 'Terminal', latitud: 14.64, longitud: -89.99, orden: 1 }],
    trazado: [],
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PanelConductor', () => {
  beforeEach(() => {
    vi.mocked(usePanelConductor).mockReturnValue({
      sesionValida: true,
      ruta: ruta(),
      paradas: [{ parada: ruta().paradas[0], activas: 3 }],
      cargando: false,
      error: null,
      reintentar: vi.fn(),
    });
  });

  it('sin sesion de conductor, avisa y lleva al inicio de sesion (criterio 6)', () => {
    vi.mocked(usePanelConductor).mockReturnValue({
      sesionValida: false,
      ruta: null,
      paradas: [],
      cargando: false,
      error: null,
      reintentar: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PanelConductor />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert').textContent).toContain('No tenés una sesión');
    const enlace = screen.getByRole('link', { name: 'Iniciar sesión' });
    expect(enlace.getAttribute('href')).toBe('/conductor/iniciar-sesion');
  });

  it('mientras carga, muestra un estado accesible en vez de una lista vacia', () => {
    vi.mocked(usePanelConductor).mockReturnValue({
      sesionValida: true,
      ruta: null,
      paradas: [],
      cargando: true,
      error: null,
      reintentar: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PanelConductor />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status').textContent).toContain('Cargando');
  });

  it('con datos, pinta la tira de paradas con la demanda de cada una', () => {
    render(
      <MemoryRouter>
        <PanelConductor />
      </MemoryRouter>,
    );

    expect(screen.getByText('Ruta Centro')).toBeTruthy();
    expect(screen.getByRole('list')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('si una actualizacion falla pero ya hay datos, avisa sin tapar la lista', () => {
    vi.mocked(usePanelConductor).mockReturnValue({
      sesionValida: true,
      ruta: ruta(),
      paradas: [{ parada: ruta().paradas[0], activas: 3 }],
      cargando: false,
      error: new ErrorApi(500, 'caido'),
      reintentar: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PanelConductor />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status').textContent).toContain('último dato conocido');
    expect(screen.getByRole('list')).toBeTruthy();
  });
});
