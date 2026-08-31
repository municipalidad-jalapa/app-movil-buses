// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';

import { PantallaRegistro } from '../../../src/paginas/PantallaRegistro';
import { useUbicacion } from '../../../src/hooks/useUbicacion';
import { registrarDemanda } from '../../../src/core/registroDemanda';
import { obtenerIdDispositivo } from '../../../src/core/identidadDispositivo';
import { ErrorApi } from '../../../src/core/errores';

vi.mock('../../../src/hooks/useUbicacion', () => ({
  useUbicacion: vi.fn(),
}));

vi.mock('../../../src/core/registroDemanda', () => ({
  registrarDemanda: vi.fn(),
}));

vi.mock('../../../src/core/identidadDispositivo', () => ({
  obtenerIdDispositivo: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe('SCRUM-148 HU-53 - Reserva de parada', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(obtenerIdDispositivo).mockReturnValue(
      'dispositivo-prueba',
    );

    vi.mocked(useUbicacion).mockReturnValue({
      ubicacion: null,
      solicitando: false,
      error: null,
      solicitarUbicacion: vi.fn().mockResolvedValue({
        latitud: 14.6335,
        longitud: -89.9885,
      }),
    });

    vi.mocked(registrarDemanda).mockResolvedValue({
      id: 10,
      paradaId: 3,
      estado: 'ACTIVA',
      expiraEn: '2026-08-30T18:00:00',
    });
  });

  function renderizarPantalla() {
    render(
      <MemoryRouter initialEntries={['/registro/3']}>
        <Routes>
          <Route
            path="/registro/:paradaId"
            element={<PantallaRegistro />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('muestra el boton principal para registrar al pasajero', () => {
    renderizarPantalla();

    expect(
      screen.getByRole('button', {
        name: 'Estoy esperando el bus',
      }),
    ).toBeTruthy();
  });

  it('muestra la explicacion de ubicacion antes de solicitarla', () => {
    renderizarPantalla();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Estoy esperando el bus',
      }),
    );

    expect(
      screen.getByText('Necesitamos tu ubicación'),
    ).toBeTruthy();
  });

  it('registra al pasajero con parada dispositivo y ubicacion', async () => {
    renderizarPantalla();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Estoy esperando el bus',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Continuar',
      }),
    );

    await waitFor(() => {
      expect(registrarDemanda).toHaveBeenCalledWith({
        dispositivoId: 'dispositivo-prueba',
        paradaId: 3,
        latitud: 14.6335,
        longitud: -89.9885,
      });
    });

    expect(
      await screen.findByText('Ya estás anotado'),
    ).toBeTruthy();
  });

  it('muestra que ya esta anotado si existe un registro activo', async () => {
    const mensaje =
      'Ya existe un registro activo para este dispositivo en la parada.';

    vi.mocked(registrarDemanda).mockRejectedValueOnce(
      new ErrorApi(
        422,
        mensaje,
        {
          timestamp: '2026-08-30T17:00:00',
          status: 422,
          error: 'Unprocessable Entity',
          message: mensaje,
          path: '/api/v1/demanda/registros',
        },
      ),
    );

    renderizarPantalla();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Estoy esperando el bus',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Continuar',
      }),
    );

    expect(
      await screen.findByText('Ya estás anotado'),
    ).toBeTruthy();
  });
});