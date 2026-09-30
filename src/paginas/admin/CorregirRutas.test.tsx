// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  eliminarParada,
  guardarParada,
  guardarTrazado,
  indiceDeInsercion,
  listarRutasAdmin,
} from '../../core/panelAdmin/rutasAdminApi';
import type { Ruta } from '../../core/tipos';
import { CorregirRutas } from './CorregirRutas';

vi.mock('../../core/panelAdmin/AuthAdminContext', () => ({
  useAuthAdmin: () => ({
    sesion: { token: 't-admin', correo: 'muni@ecoruta.gt', expiraEnMs: Date.now() + 3_600_000, inactividadMinutos: 30 },
    renovarSesion: vi.fn(),
    cerrarSesion: vi.fn(),
  }),
}));
vi.mock('../../core/panelAdmin/rutasAdminApi', async (original) => ({
  ...(await original<typeof import('../../core/panelAdmin/rutasAdminApi')>()),
  listarRutasAdmin: vi.fn(),
  guardarTrazado: vi.fn(),
  guardarParada: vi.fn(),
  eliminarParada: vi.fn(),
}));

const RUTA: Ruta = {
  id: 1,
  nombre: 'Ruta de ejemplo - Centro de Jalapa',
  activa: true,
  paradas: [
    { id: 1, nombre: 'Parque Central', latitud: 14.634878, longitud: -89.981202, orden: 1 },
    { id: 2, nombre: '1a Calle - Mercado', latitud: 14.63245, longitud: -89.987308, orden: 2 },
  ],
  trazado: [],
};

function abrir() {
  render(
    <MemoryRouter initialEntries={['/admin/rutas']}>
      <CorregirRutas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(listarRutasAdmin).mockReset().mockResolvedValue([RUTA]);
  vi.mocked(guardarTrazado).mockReset();
  vi.mocked(guardarParada).mockReset();
  vi.mocked(eliminarParada).mockReset();
});
afterEach(cleanup);

describe('Corregir rutas en el panel municipal (QA 5.6)', () => {
  it('se llega desde la navegacion del panel y muestra la ruta con sus paradas', async () => {
    abrir();
    expect(await screen.findByRole('heading', { name: 'Rutas' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Rutas' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Estado del servicio' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Parque Central/ })).toBeTruthy();
  });

  it('sin trazado propone unir las paradas y permite guardarlo', async () => {
    vi.mocked(guardarTrazado).mockResolvedValue({ ...RUTA, trazado: RUTA.paradas.map(({ latitud, longitud }) => ({ latitud, longitud })) });
    abrir();
    await screen.findByText(/^2 puntos · con cambios sin guardar/);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar recorrido' }));
    await screen.findByText(/Trazado guardado: 2 puntos/);
    expect(guardarTrazado).toHaveBeenCalledWith('t-admin', 1, [
      { latitud: 14.634878, longitud: -89.981202 },
      { latitud: 14.63245, longitud: -89.987308 },
    ]);
  });

  it('corrige el nombre de una parada y lo guarda', async () => {
    vi.mocked(guardarParada).mockResolvedValue(RUTA);
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /Mercado/ }));
    const campo = screen.getByLabelText('Nombre de la parada') as HTMLInputElement;
    expect(campo.value).toBe('1a Calle - Mercado');
    fireEvent.change(campo, { target: { value: 'Mercado Municipal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar parada' }));
    await waitFor(() =>
      expect(guardarParada).toHaveBeenCalledWith('t-admin', 1, 2, {
        nombre: 'Mercado Municipal',
        latitud: 14.63245,
        longitud: -89.987308,
      }),
    );
    expect(await screen.findByText('Parada «Mercado Municipal» guardada.')).toBeTruthy();
  });

  it('una parada sin nombre no se envia', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /Parque Central/ }));
    fireEvent.change(screen.getByLabelText('Nombre de la parada'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar parada' }));
    expect(await screen.findByText('La parada necesita un nombre.')).toBeTruthy();
    expect(guardarParada).not.toHaveBeenCalled();
  });

  it('elimina una parada despues de confirmar', async () => {
    vi.mocked(eliminarParada).mockResolvedValue({ ...RUTA, paradas: [RUTA.paradas[0]] });
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /Mercado/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar parada' }));
    expect(eliminarParada).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    await screen.findByText('Parada «1a Calle - Mercado» eliminada del recorrido.');
    expect(eliminarParada).toHaveBeenCalledWith('t-admin', 1, 2);
    expect(screen.queryByRole('button', { name: /Mercado/ })).toBeNull();
  });

  it('cancelar no elimina la parada', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /Parque Central/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar parada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Eliminar parada' })).toBeTruthy();
    expect(eliminarParada).not.toHaveBeenCalled();
  });
});

describe('indiceDeInsercion', () => {
  const linea = [
    { latitud: 0, longitud: 0 },
    { latitud: 0, longitud: 10 },
    { latitud: 10, longitud: 10 },
  ];

  it('inserta en el tramo mas cercano al clic', () => {
    expect(indiceDeInsercion(linea, { latitud: 1, longitud: 5 })).toBe(1);
    expect(indiceDeInsercion(linea, { latitud: 5, longitud: 9 })).toBe(2);
  });

  it('con menos de dos puntos agrega al final', () => {
    expect(indiceDeInsercion([], { latitud: 1, longitud: 1 })).toBe(0);
    expect(indiceDeInsercion([linea[0]], { latitud: 1, longitud: 1 })).toBe(1);
  });
});
