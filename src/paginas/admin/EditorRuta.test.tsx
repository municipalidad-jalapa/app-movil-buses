// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthAdminContext, type EstadoAuthAdmin } from '../../core/panelAdmin/AuthAdminContext';
import { largoEnMetros } from '../../core/panelAdmin/geometriaRuta';
import {
  agregarParada,
  ajustarACalles,
  guardarParada,
  guardarTrazado,
  listarRutasAdmin,
  publicarRuta,
  type PuntoGeo,
} from '../../core/panelAdmin/rutasAdminApi';
import { asignarVehiculo, listarVehiculos } from '../../core/panelAdmin/vehiculosAdminApi';
import type { Ruta } from '../../core/tipos';
import { EditorRuta } from './EditorRuta';

// MapLibre no corre en jsdom: el mapa se reemplaza por uno que guarda sus props
// para disparar a mano un trazo, una pasada del borrador o un clic derecho.
const mapa = vi.hoisted(() => ({
  props: null as null | {
    trazado: PuntoGeo[];
    herramienta: string;
    onTrazo: (p: PuntoGeo[]) => void;
    onBorrar: (goma: PuntoGeo[], radio: number) => void;
    onCrearParada: (p: PuntoGeo) => void;
  },
}));
vi.mock('../../componentes/admin/MapaDeDibujo', () => ({
  MapaDeDibujo: (p: NonNullable<typeof mapa.props>) => {
    mapa.props = p;
    return <p>Mapa con {p.trazado.length} puntos</p>;
  },
}));
vi.mock('../../core/panelAdmin/rutasAdminApi', () => ({
  listarRutasAdmin: vi.fn(),
  guardarTrazado: vi.fn(),
  ajustarACalles: vi.fn(),
  agregarParada: vi.fn(),
  guardarParada: vi.fn(),
  eliminarParada: vi.fn(),
  publicarRuta: vi.fn(),
}));
vi.mock('../../core/panelAdmin/vehiculosAdminApi', () => ({ listarVehiculos: vi.fn(), asignarVehiculo: vi.fn() }));
vi.mock('../../hooks/useInactividad', () => ({ useInactividad: () => ({ segundosRestantes: null, seguir: vi.fn() }) }));

const AUTH = {
  estado: 'dentro',
  sesion: { token: 't', correo: 'admin@jalapa.gob.gt', expiraEnMs: Date.now() + 3_600_000 },
  cerrarSesion: vi.fn(),
  renovarSesion: vi.fn(),
} as unknown as EstadoAuthAdmin;

const A = { latitud: 14.63, longitud: -89.99 };
const B = { latitud: 14.63, longitud: -89.9807 };
const C = { latitud: 14.638, longitud: -89.9807 };
const RUTA: Ruta = {
  id: 5,
  nombre: 'RUTA NORTE',
  activa: false,
  trazado: [A, B],
  paradas: [
    { id: 1, nombre: 'Parque', latitud: 14.63, longitud: -89.99, orden: 1 },
    { id: 2, nombre: 'Mercado', latitud: 14.63, longitud: -89.985, orden: 2 },
  ],
};

function abrir(id = 5) {
  render(
    <AuthAdminContext.Provider value={AUTH}>
      <MemoryRouter initialEntries={[`/admin/rutas/${id}`]}>
        <Routes>
          <Route path="/admin/rutas/:rutaId" element={<EditorRuta />} />
        </Routes>
      </MemoryRouter>
    </AuthAdminContext.Provider>,
  );
}

beforeEach(() => {
  mapa.props = null;
  vi.mocked(listarRutasAdmin).mockResolvedValue([RUTA]);
  vi.mocked(guardarTrazado).mockImplementation(async (_t, _id, puntos) => ({ ...RUTA, trazado: puntos }));
  vi.mocked(listarVehiculos).mockResolvedValue([
    { id: 3, identificador: 'BUS-03', placa: 'P-3', activo: true, rutaId: null, capacidad: 30, gps: null },
  ]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Editor de una ruta', () => {
  it('cada trazo a mano se ajusta a las calles, se suma al final y se guarda solo', async () => {
    vi.mocked(ajustarACalles).mockResolvedValue({ puntos: [B, C], ajustado: true });
    abrir();
    expect(await screen.findByText('Mapa con 2 puntos')).toBeTruthy();

    const crudo = [{ latitud: 14.631, longitud: -89.9808 }, { latitud: 14.634, longitud: -89.9806 }, C];
    await act(async () => mapa.props!.onTrazo(crudo));

    // Se manda desde el final del recorrido: el trazo siempre continua.
    expect(ajustarACalles).toHaveBeenCalledWith('t', [B, ...crudo]);
    expect(await screen.findByText('Mapa con 3 puntos')).toBeTruthy();
    await waitFor(() => expect(guardarTrazado).toHaveBeenCalledWith('t', 5, [A, B, C]), { timeout: 2000 });
    expect(await screen.findByText('Guardado automáticamente')).toBeTruthy();
  });

  it('un tramo sin calles cerca queda como se dibujó y lo avisa', async () => {
    vi.mocked(ajustarACalles).mockImplementation(async (_t, puntos) => ({ puntos, ajustado: false }));
    abrir();
    await screen.findByText('Mapa con 2 puntos');
    await act(async () => mapa.props!.onTrazo([{ latitud: 14.631, longitud: -89.98 }, C, C]));

    expect(await screen.findByText(/quedó como lo dibujaste/)).toBeTruthy();
  });

  it('el borrador recorta lo que sobra al final y lo guarda', async () => {
    abrir();
    await screen.findByText('Mapa con 2 puntos');
    const boton = screen.getByRole('button', { name: 'Borrador' });
    fireEvent.click(boton);
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    expect(mapa.props!.herramienta).toBe('borrador');

    // Pasa sobre el final (B) con un borrador de 100 m.
    act(() => mapa.props!.onBorrar([B], 100));

    await waitFor(() => expect(guardarTrazado).toHaveBeenCalled(), { timeout: 2000 });
    const [, , guardado] = vi.mocked(guardarTrazado).mock.calls.at(-1)!;
    expect(guardado[0]).toEqual(A);
    expect(largoEnMetros(guardado)).toBeCloseTo(largoEnMetros([A, B]) - 100, 0);
    // Una punta no deja hueco: no hace falta ir a las calles.
    expect(ajustarACalles).not.toHaveBeenCalled();
  });

  it('borrar en medio vuelve a unir los dos pedazos por las calles', async () => {
    const mitad = { latitud: 14.63, longitud: (A.longitud + B.longitud) / 2 };
    const vuelta = { latitud: 14.6304, longitud: mitad.longitud };
    vi.mocked(ajustarACalles).mockImplementation(async (_t, [fin, inicio]) => ({ puntos: [fin, vuelta, inicio], ajustado: true }));
    abrir();
    await screen.findByText('Mapa con 2 puntos');
    fireEvent.click(screen.getByRole('button', { name: 'Borrador' }));

    await act(async () => mapa.props!.onBorrar([mitad], 50));

    // Se pide solo el hueco: desde donde termina un pedazo hasta donde empieza el otro.
    const [, hueco] = vi.mocked(ajustarACalles).mock.calls[0];
    expect(hueco).toHaveLength(2);
    expect(largoEnMetros(hueco)).toBeCloseTo(100, 0);
    expect(await screen.findByText('Mapa con 5 puntos')).toBeTruthy();
    await waitFor(() => expect(guardarTrazado).toHaveBeenCalled(), { timeout: 2000 });
    const [, , guardado] = vi.mocked(guardarTrazado).mock.calls.at(-1)!;
    expect(guardado[0]).toEqual(A);
    expect(guardado.at(-1)).toEqual(B);
    expect(guardado).toContainEqual(vuelta);

    // Deshacer devuelve lo borrado.
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Mapa con 2 puntos')).toBeTruthy();
  });

  it('si el hueco no se puede volver a unir, no se borra nada', async () => {
    vi.mocked(ajustarACalles).mockRejectedValue(new Error('sin red'));
    abrir();
    await screen.findByText('Mapa con 2 puntos');
    fireEvent.click(screen.getByRole('button', { name: 'Borrador' }));

    await act(async () => mapa.props!.onBorrar([{ latitud: 14.63, longitud: (A.longitud + B.longitud) / 2 }], 50));

    expect(await screen.findByText(/No se borró nada/)).toBeTruthy();
    expect(screen.getByText('Mapa con 2 puntos')).toBeTruthy();
    expect(guardarTrazado).not.toHaveBeenCalled();
  });

  it('deshacer vuelve al recorrido anterior y también se guarda', async () => {
    vi.mocked(ajustarACalles).mockResolvedValue({ puntos: [B, C], ajustado: true });
    abrir();
    await screen.findByText('Mapa con 2 puntos');
    await act(async () => mapa.props!.onTrazo([B, C, C]));
    await screen.findByText('Mapa con 3 puntos');

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(await screen.findByText('Mapa con 2 puntos')).toBeTruthy();
    await waitFor(() => expect(guardarTrazado).toHaveBeenLastCalledWith('t', 5, [A, B]), { timeout: 2000 });

    fireEvent.click(screen.getByRole('button', { name: 'Rehacer' }));
    expect(await screen.findByText('Mapa con 3 puntos')).toBeTruthy();
  });

  it('clic derecho crea la parada pegada al recorrido y pide su nombre', async () => {
    const nueva = { id: 9, nombre: 'Parada 3', latitud: 14.63, longitud: -89.982, orden: 3 };
    vi.mocked(agregarParada).mockResolvedValue({ ...RUTA, paradas: [...RUTA.paradas, nueva] });
    vi.mocked(guardarParada).mockResolvedValue({ ...RUTA, paradas: [...RUTA.paradas, { ...nueva, nombre: 'Hospital' }] });
    abrir();
    await screen.findByText('Mapa con 2 puntos');

    // Marcada a ~20 m de la linea: se pega a ella.
    await act(async () => mapa.props!.onCrearParada({ latitud: 14.63018, longitud: -89.982 }));

    const [, , datos] = vi.mocked(agregarParada).mock.calls[0];
    expect(datos.nombre).toBe('Parada 3');
    expect(datos.latitud).toBeCloseTo(14.63, 6);
    expect(await screen.findByText('Nueva: poné el nombre')).toBeTruthy();

    const campo = screen.getByLabelText('Nombre de la parada 3');
    fireEvent.change(campo, { target: { value: 'Hospital' } });
    fireEvent.blur(campo);
    await waitFor(() =>
      expect(guardarParada).toHaveBeenCalledWith('t', 5, 9, { nombre: 'Hospital', latitud: 14.63, longitud: -89.982 }),
    );
  });

  it('revisar muestra lo que falta, asigna el bus y publica', async () => {
    vi.mocked(publicarRuta).mockResolvedValue({ ...RUTA, activa: true });
    vi.mocked(asignarVehiculo).mockResolvedValue(null);
    abrir();
    await screen.findByText('Mapa con 2 puntos');
    fireEvent.click(screen.getAllByRole('button', { name: 'Siguiente: revisar' })[0]);

    expect(await screen.findByRole('heading', { name: 'Antes de publicar' })).toBeTruthy();
    expect(screen.getByText('2, numeradas según el recorrido')).toBeTruthy();

    fireEvent.change(await screen.findByLabelText(/Bus que la recorre/), { target: { value: '3' } });
    await waitFor(() => expect(asignarVehiculo).toHaveBeenCalledWith('t', 3, { rutaId: 5, capacidad: 30 }));

    // En el telefono la hoja se abre sola y se puede volver a editar.
    expect(screen.getByRole('complementary', { name: 'Detalles de la ruta' }).className).toContain('editor__panel--abierto');
    expect(screen.getAllByRole('button', { name: 'Volver al recorrido' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Publicar RUTA NORTE' }));
    await waitFor(() => expect(publicarRuta).toHaveBeenCalledWith('t', 5, true));
    expect(await screen.findByText(/los pasajeros ya ven RUTA NORTE/)).toBeTruthy();
  });

  it('una ruta que no existe o se eliminó lo dice', async () => {
    abrir(99);
    expect(await screen.findByText('Esa ruta no existe o se eliminó.')).toBeTruthy();
  });
});
