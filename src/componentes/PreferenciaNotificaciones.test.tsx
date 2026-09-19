// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PreferenciaNotificaciones } from './PreferenciaNotificaciones';
import {
  marcarRechazado,
  sePuedeOfrecerAvisos,
  solicitarPermiso,
  yaFueRechazado,
} from '../core/notificaciones/permisoNotificaciones';
import { obtenerTokenNotificacion } from '../core/notificaciones/mensajeria';
import { registrarTokenDelDispositivo } from '../core/notificaciones/registroDeToken';

vi.mock('../core/notificaciones/permisoNotificaciones', () => ({
  sePuedeOfrecerAvisos: vi.fn(),
  solicitarPermiso: vi.fn(),
  marcarRechazado: vi.fn(),
  yaFueRechazado: vi.fn(),
}));

vi.mock('../core/notificaciones/mensajeria', () => ({
  obtenerTokenNotificacion: vi.fn(),
}));

vi.mock('../core/notificaciones/registroDeToken', () => ({
  registrarTokenDelDispositivo: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sePuedeOfrecerAvisos).mockReturnValue(true);
  vi.mocked(yaFueRechazado).mockReturnValue(false);
  vi.mocked(obtenerTokenNotificacion).mockResolvedValue('token-fcm');
  vi.mocked(registrarTokenDelDispositivo).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe('PreferenciaNotificaciones', () => {
  it('explica para que sirven los avisos antes de pedir el permiso', () => {
    render(<PreferenciaNotificaciones />);

    expect(screen.getByText(/Te avisamos cuando el bus ya viene/)).toBeTruthy();
    // El dialogo del navegador no se abrio solo: hace falta un gesto.
    expect(solicitarPermiso).not.toHaveBeenCalled();
  });

  it('no vuelve a ofrecerse si el pasajero ya dijo que no', () => {
    vi.mocked(sePuedeOfrecerAvisos).mockReturnValue(false);

    const { container } = render(<PreferenciaNotificaciones />);

    expect(container.firstChild).toBeNull();
  });

  it('recuerda el rechazo al elegir seguir sin permisos', () => {
    render(<PreferenciaNotificaciones />);

    fireEvent.click(screen.getByRole('button', { name: 'Seguir sin dar permisos' }));

    expect(marcarRechazado).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Activar avisos' })).not.toBeTruthy();
  });

  it('registra el token del navegador cuando concede el permiso', async () => {
    vi.mocked(solicitarPermiso).mockResolvedValue('concedido');

    render(<PreferenciaNotificaciones />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));

    await waitFor(() => {
      expect(registrarTokenDelDispositivo).toHaveBeenCalledWith('token-fcm');
    });
  });

  it('se retira sin insistir si el navegador deniega el permiso', async () => {
    vi.mocked(solicitarPermiso).mockResolvedValue('denegado');

    const { container } = render(<PreferenciaNotificaciones />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
    expect(registrarTokenDelDispositivo).not.toHaveBeenCalled();
  });

  it('no muestra error al pasajero si falla el registro del token', async () => {
    vi.mocked(solicitarPermiso).mockResolvedValue('concedido');
    vi.mocked(registrarTokenDelDispositivo).mockRejectedValue(new Error('sin red'));

    render(<PreferenciaNotificaciones />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));

    // La reserva ya esta hecha: los avisos son un extra y su falla es muda.
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeTruthy();
    });
  });

  it('sigue adelante cuando el entorno no tiene Firebase configurado', async () => {
    vi.mocked(solicitarPermiso).mockResolvedValue('concedido');
    vi.mocked(obtenerTokenNotificacion).mockResolvedValue(null);

    render(<PreferenciaNotificaciones />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar avisos' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeTruthy();
    });
    expect(registrarTokenDelDispositivo).not.toHaveBeenCalled();
  });
});
