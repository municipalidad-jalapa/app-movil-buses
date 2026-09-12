// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PanelConductor } from '../../../src/paginas/conductor/PanelConductor';
import { useAuth } from '../../../src/core/autenticacion/useAuth';
import { usePanelConductor } from '../../../src/hooks/usePanelConductor';
import { ErrorApi } from '../../../src/core/errores';
import type { FilaPanelConductor } from '../../../src/core/panelConductor';

vi.mock('../../../src/core/autenticacion/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../src/hooks/usePanelConductor', () => ({
  usePanelConductor: vi.fn(),
}));

afterEach(cleanup);

function unaFila(sobrescribir: Partial<FilaPanelConductor> = {}): FilaPanelConductor {
  return {
    paradaId: 1,
    nombre: 'Parque Central',
    orden: 1,
    atendida: false,
    reservasActivas: 3,
    eta: { tipo: 'exacto', minutos: 6 },
    ...sobrescribir,
  };
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    usuario: { correo: 'conductor@ecoruta.gt' },
    token: 'jwt',
    rol: 'CONDUCTOR',
    cargando: false,
    mensajeSesion: null,
    iniciarSesion: vi.fn(),
    cerrarSesion: vi.fn(),
  });
});

describe('Desarrollo-75 HU-75 - Panel del conductor', () => {
  it('AC1: muestra el ETA y las reservas activas de cada parada', () => {
    vi.mocked(usePanelConductor).mockReturnValue({
      filas: [
        unaFila({ paradaId: 1, nombre: 'Parque Central', reservasActivas: 3, eta: { tipo: 'exacto', minutos: 6 } }),
        unaFila({
          paradaId: 2,
          nombre: 'Mercado',
          reservasActivas: 1,
          eta: { tipo: 'rango', minMinutos: 8, maxMinutos: 11 },
        }),
      ],
      cargando: false,
      error: null,
      actualizadoEn: new Date('2026-09-08T10:00:00Z'),
      reintentar: vi.fn(),
    });

    render(<PanelConductor />);

    expect(screen.getByText('Parque Central')).toBeTruthy();
    expect(screen.getByText('Llega en 6 min')).toBeTruthy();
    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByText('Llega en 8–11 min')).toBeTruthy();
  });

  it('AC5: distingue las paradas atendidas de las pendientes', () => {
    vi.mocked(usePanelConductor).mockReturnValue({
      filas: [
        unaFila({ paradaId: 1, nombre: 'Parque Central', atendida: true, eta: { tipo: 'atendida' } }),
        unaFila({ paradaId: 2, nombre: 'Mercado', atendida: false }),
      ],
      cargando: false,
      error: null,
      actualizadoEn: new Date(),
      reintentar: vi.fn(),
    });

    render(<PanelConductor />);

    expect(screen.getByText('Atendida')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
  });

  it('AC6: indica cuando el ETA no es confiable en vez de mostrar un numero enganoso', () => {
    vi.mocked(usePanelConductor).mockReturnValue({
      filas: [unaFila({ eta: { tipo: 'no-disponible' } })],
      cargando: false,
      error: null,
      actualizadoEn: new Date(),
      reintentar: vi.fn(),
    });

    render(<PanelConductor />);

    expect(screen.getByText('Tiempo no disponible por ahora')).toBeTruthy();
    expect(screen.queryByText(/Llega en/)).toBeNull();
  });

  it('AC4: muestra el estado de carga mientras no llega el primer dato', () => {
    vi.mocked(usePanelConductor).mockReturnValue({
      filas: [],
      cargando: true,
      error: null,
      actualizadoEn: null,
      reintentar: vi.fn(),
    });

    render(<PanelConductor />);

    expect(screen.getByText('Cargando paradas…')).toBeTruthy();
  });

  it('AC2/Contrato: muestra el error en lenguaje claro y permite reintentar ante un 403', () => {
    const reintentar = vi.fn();
    vi.mocked(usePanelConductor).mockReturnValue({
      filas: [],
      cargando: false,
      error: new ErrorApi(403, 'sin permiso'),
      actualizadoEn: null,
      reintentar,
    });

    render(<PanelConductor />);

    expect(screen.getByText('No tienes permiso para hacer esto.')).toBeTruthy();

    screen.getByRole('button', { name: 'Intentar de nuevo' }).click();
    expect(reintentar).toHaveBeenCalled();
  });
});
