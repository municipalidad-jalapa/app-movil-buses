// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthAdminContext, type EstadoAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { listarRutasAdmin } from '../../core/panelAdmin/rutasAdminApi';
import { asignarVehiculo, crearVehiculo, listarVehiculos } from '../../core/panelAdmin/vehiculosAdminApi';
import { Vehiculos } from './Vehiculos';

vi.mock('../../core/panelAdmin/vehiculosAdminApi', () => ({
  listarVehiculos: vi.fn(),
  crearVehiculo: vi.fn(),
  asignarVehiculo: vi.fn(),
}));
vi.mock('../../core/panelAdmin/rutasAdminApi', () => ({ listarRutasAdmin: vi.fn() }));
vi.mock('../../hooks/useInactividad', () => ({ useInactividad: () => ({ segundosRestantes: null, seguir: vi.fn() }) }));

const AUTH = {
  estado: 'dentro',
  sesion: { token: 't', correo: 'admin@jalapa.gob.gt', expiraEnMs: Date.now() + 3_600_000 },
  cerrarSesion: vi.fn(),
  renovarSesion: vi.fn(),
} as unknown as EstadoAuthAdmin;

const BUS = { id: 1, identificador: 'BUS-01', placa: 'MIBUS-001', activo: true, rutaId: 1, capacidad: null };

function abrir() {
  render(
    <AuthAdminContext.Provider value={AUTH}>
      <MemoryRouter>
        <Vehiculos />
      </MemoryRouter>
    </AuthAdminContext.Provider>,
  );
}

beforeEach(() => {
  vi.mocked(listarVehiculos).mockResolvedValue([BUS]);
  vi.mocked(listarRutasAdmin).mockResolvedValue([
    { id: 1, nombre: 'RUTA PRINCIPAL', activa: true, paradas: [], trazado: [] },
    { id: 2, nombre: 'RUTA NORTE', activa: false, paradas: [], trazado: [] },
  ] as never);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Vehículos en el panel municipal', () => {
  it('da de alta un bus con ruta y capacidad', async () => {
    vi.mocked(crearVehiculo).mockResolvedValue({ ...BUS, id: 3, identificador: 'BUS-03', placa: 'P-1', rutaId: 2, capacidad: 40 });
    abrir();
    await screen.findByText('BUS-01');

    fireEvent.change(screen.getByLabelText('Número'), { target: { value: 'BUS-03' } });
    fireEvent.change(screen.getByLabelText('Placa'), { target: { value: 'P-1' } });
    fireEvent.change(screen.getByLabelText('Ruta'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Capacidad (personas)'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dar de alta' }));

    await screen.findByText('Bus BUS-03 dado de alta.');
    expect(crearVehiculo).toHaveBeenCalledWith('t', { identificador: 'BUS-03', placa: 'P-1', rutaId: 2, capacidad: 40 });
    expect(screen.getByText('BUS-03')).toBeTruthy();
  });

  it('cambia la capacidad de un bus existente', async () => {
    vi.mocked(asignarVehiculo).mockResolvedValue({ ...BUS, capacidad: 30 });
    abrir();
    const fila = (await screen.findByText('BUS-01')).closest('tr')!;
    fireEvent.change(within(fila).getByLabelText('Capacidad de BUS-01'), { target: { value: '30' } });
    fireEvent.click(within(fila).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(asignarVehiculo).toHaveBeenCalledWith('t', 1, { rutaId: 1, capacidad: 30 }));
  });
});
