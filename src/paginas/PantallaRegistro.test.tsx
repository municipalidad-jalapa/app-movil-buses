// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { PantallaRegistro } from './PantallaRegistro';
import { useUbicacion } from '../hooks/useUbicacion';
import { registrarDemanda } from '../core/registroDemanda';
import { obtenerIdDispositivo } from '../core/identidadDispositivo';
import { ErrorApi } from '../core/errores';

afterEach(() => {
  cleanup();
});

vi.mock('../hooks/useUbicacion', () => ({
  useUbicacion: vi.fn(),
}));

vi.mock('../core/registroDemanda', () => ({
  registrarDemanda: vi.fn(),
}));

vi.mock('../core/identidadDispositivo', () => ({
  obtenerIdDispositivo: vi.fn(),
}));

describe('PantallaRegistro', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(obtenerIdDispositivo).mockReturnValue('dispositivo-prueba');

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
      expiraEn: '2026-08-26T11:30:00',
    });
  });

  it('registra al pasajero con parada, dispositivo y ubicacion', async () => {
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

    expect(
      screen.getByRole('button', {
        name: 'Estoy esperando el bus',
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Estoy esperando el bus',
      }),
    );

    expect(
      screen.getByText('Necesitamos tu ubicación'),
    ).toBeTruthy();

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

    await waitFor(() => {
      expect(
        screen.getByText('Ya estás anotado'),
      ).toBeTruthy();
    });

    expect(
      screen.getByText(/parada 3/i),
    ).toBeTruthy();
    });

    it('muestra que ya esta anotado cuando existe un registro activo', async () => {
  const mensaje =
    'Ya existe un registro activo para este dispositivo en la parada.';

  vi.mocked(registrarDemanda).mockRejectedValueOnce(
    new ErrorApi(
      422,
      mensaje,
      {
        timestamp: '2026-08-26T12:00:00',
        status: 422,
        error: 'Unprocessable Entity',
        message: mensaje,
        path: '/api/v1/demanda/registros',
      },
    ),
  );

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
    expect(
      screen.getByText('Ya estás anotado'),
    ).toBeTruthy();
  });
});

});
