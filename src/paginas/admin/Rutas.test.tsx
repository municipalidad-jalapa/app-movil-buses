// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthAdminContext, type EstadoAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { crearRuta, eliminarRuta, listarRutasAdmin } from '../../core/panelAdmin/rutasAdminApi';
import { listarVehiculos } from '../../core/panelAdmin/vehiculosAdminApi';
import type { Ruta } from '../../core/tipos';
import { Rutas } from './Rutas';

vi.mock('../../core/panelAdmin/rutasAdminApi', () => ({
  listarRutasAdmin: vi.fn(),
  crearRuta: vi.fn(),
  eliminarRuta: vi.fn(),
}));
vi.mock('../../core/panelAdmin/vehiculosAdminApi', () => ({ listarVehiculos: vi.fn() }));
vi.mock('../../hooks/useInactividad', () => ({ useInactividad: () => ({ segundosRestantes: null, seguir: vi.fn() }) }));

const AUTH = {
  estado: 'dentro',
  sesion: { token: 't', correo: 'admin@jalapa.gob.gt', expiraEnMs: Date.now() + 3_600_000 },
  cerrarSesion: vi.fn(),
  renovarSesion: vi.fn(),
} as unknown as EstadoAuthAdmin;

const A = { latitud: 14.63, longitud: -89.99 };
const B = { latitud: 14.63, longitud: -89.9807 };
const PRINCIPAL: Ruta = {
  id: 1,
  nombre: 'RUTA PRINCIPAL',
  activa: true,
  trazado: [A, B],
  paradas: [
    { id: 1, nombre: 'Parque', latitud: 14.63, longitud: -89.99, orden: 1 },
    { id: 2, nombre: 'Mercado', latitud: 14.63, longitud: -89.98, orden: 2 },
  ],
};
const DOMI: Ruta = { id: 7, nombre: 'DOMI', activa: false, trazado: [], paradas: [] };

function abrir() {
  render(
    <AuthAdminContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={['/admin/rutas']}>
        <Routes>
          <Route path="/admin/rutas" element={<Rutas />} />
          <Route path="/admin/rutas/:rutaId" element={<p>Editor abierto</p>} />
        </Routes>
      </MemoryRouter>
    </AuthAdminContext.Provider>,
  );
}

beforeEach(() => {
  vi.mocked(listarRutasAdmin).mockResolvedValue([PRINCIPAL, DOMI]);
  vi.mocked(listarVehiculos).mockResolvedValue([
    { id: 1, identificador: 'BUS-01', placa: 'P-1', activo: true, rutaId: 1, capacidad: 30, gps: null },
  ]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Rutas del panel municipal', () => {
  it('dice en qué va cada ruta: publicada con su recorrido y bus, o el paso que le falta', async () => {
    abrir();
    const principal = (await screen.findByRole('heading', { name: 'RUTA PRINCIPAL' })).closest('li')!;
    expect(within(principal).getByText('Publicada', { selector: '.rutas__estado' })).toBeTruthy();
    expect(within(principal).getByText('1,0 km')).toBeTruthy();
    expect(within(principal).getByText('2 paradas')).toBeTruthy();
    expect(within(principal).getByText('BUS-01')).toBeTruthy();
    expect(within(principal).getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe('/admin/rutas/1');

    const domi = screen.getByRole('heading', { name: 'DOMI' }).closest('li')!;
    expect(within(domi).getByText('Paso 2 de 3 · falta el recorrido')).toBeTruthy();
    expect(within(domi).getByRole('link', { name: 'Seguir editando' })).toBeTruthy();
  });

  it('crear una ruta abre el editor para dibujarla', async () => {
    vi.mocked(crearRuta).mockResolvedValue({ ...DOMI, id: 9, nombre: 'RUTA NORTE' });
    abrir();
    fireEvent.change(await screen.findByLabelText('Nombre de la ruta'), { target: { value: ' RUTA NORTE ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Empezar a dibujar' }));

    expect(await screen.findByText('Editor abierto')).toBeTruthy();
    expect(crearRuta).toHaveBeenCalledWith('t', 'RUTA NORTE');
  });

  it('eliminar pide escribir el nombre y después la saca de la lista', async () => {
    vi.mocked(eliminarRuta).mockResolvedValue(undefined);
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar DOMI' }));

    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar la ruta DOMI?' });
    const confirmar = within(dialogo).getByRole('button', { name: 'Eliminar ruta' }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(within(dialogo).getByRole('textbox'), { target: { value: 'domi' } });
    expect(confirmar.disabled).toBe(false);
    fireEvent.click(confirmar);

    await waitFor(() => expect(eliminarRuta).toHaveBeenCalledWith('t', 7));
    expect(await screen.findByText('Ruta «DOMI» eliminada.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'DOMI' })).toBeNull();
  });

  it('cancelar no elimina nada', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar RUTA PRINCIPAL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(eliminarRuta).not.toHaveBeenCalled();
  });
});
