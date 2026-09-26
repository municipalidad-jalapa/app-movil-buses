// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorApi } from '../../core/errores';
import {
  elegirRutaConductor,
  marcarParadaAtendida,
  obtenerPanelConductor,
  obtenerRutaConductor,
  type PanelConductor as Panel,
  type RutaDelConductor,
} from '../../core/panelConductor';
import { PanelConductor } from './PanelConductor';

vi.mock('../../core/autenticacion/useAuth', () => ({
  useAuth: () => ({ usuario: { correo: 'piloto@ecoruta.gt' }, rol: 'CONDUCTOR', cerrarSesion: vi.fn() }),
}));
vi.mock('../../core/panelConductor', async (original) => ({
  ...(await original<typeof import('../../core/panelConductor')>()),
  obtenerPanelConductor: vi.fn(),
  marcarParadaAtendida: vi.fn(),
  obtenerRutaConductor: vi.fn(),
  elegirRutaConductor: vi.fn(),
}));
// La ruta con la ubicacion de sus paradas y el bus en vivo, controlables por caso.
const { RUTA_UBICADA, posicionDelBus } = vi.hoisted(() => ({
  RUTA_UBICADA: {
    id: 1,
    nombre: 'RUTA PRINCIPAL',
    activa: true,
    trazado: [],
    paradas: [
      { id: 1, nombre: 'Parque Central', latitud: 14.6349, longitud: -89.9811, orden: 1 },
      { id: 2, nombre: 'Mercado', latitud: 14.6326, longitud: -89.9868, orden: 2 },
      { id: 3, nombre: 'El Calvario', latitud: 14.6306, longitud: -89.9929, orden: 3 },
      { id: 4, nombre: 'Terminal', latitud: 14.6297, longitud: -89.9962, orden: 4 },
    ],
  },
  posicionDelBus: vi.fn((): unknown => null),
}));
vi.mock('../../hooks/useRutas', () => ({ useRutas: () => ({ rutas: [RUTA_UBICADA] }) }));
vi.mock('../../hooks/usePosicionBus', () => ({ usePosicionBus: () => ({ posicion: posicionDelBus() }) }));
// MapLibre no corre en jsdom: el mapa se prueba aparte.
vi.mock('../../componentes/conductor/MapaConductor', () => ({
  MapaConductor: ({ panel }: { panel: { rutaNombre: string } }) => <p>Mapa de {panel.rutaNombre}</p>,
}));
vi.mock('../../componentes/atrasos/ReportarAtraso', () => ({
  ReportarAtraso: () => <p>Formulario de atraso</p>,
}));

const PANEL: Panel = {
  rutaId: 1,
  rutaNombre: 'RUTA PRINCIPAL',
  estadoBus: 'EN_RUTA',
  calculadoEn: '2026-09-23T15:00:00Z',
  subieronHoy: 21,
  bajaronHoy: 9,
  aBordo: 12,
  vuelta: 2,
  paradas: [
    { paradaId: 1, nombre: 'Parque Central', orden: 1, reservasActivas: 3, minutos: 8, confiable: true, atendidaEn: null },
    { paradaId: 2, nombre: 'Mercado', orden: 2, reservasActivas: 2, minutos: 2, confiable: true, atendidaEn: null },
    { paradaId: 3, nombre: 'El Calvario', orden: 3, reservasActivas: 0, minutos: 11, confiable: true, atendidaEn: null },
    { paradaId: 4, nombre: 'Terminal', orden: 4, reservasActivas: 0, minutos: null, confiable: false, atendidaEn: '2026-09-23T14:50:00Z' },
  ],
};

const RUTAS: RutaDelConductor = {
  rutaId: 1,
  rutaNombre: 'RUTA PRINCIPAL',
  rutas: [
    { id: 1, nombre: 'RUTA PRINCIPAL' },
    { id: 2, nombre: 'RUTA SECUNDARIA' },
  ],
};

function abrir() {
  render(
    <MemoryRouter>
      <PanelConductor />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(obtenerPanelConductor).mockReset().mockResolvedValue(PANEL);
  vi.mocked(marcarParadaAtendida).mockReset();
  posicionDelBus.mockReset().mockReturnValue(null);
  vi.mocked(obtenerRutaConductor).mockReset().mockResolvedValue(RUTAS);
  vi.mocked(elegirRutaConductor).mockReset().mockResolvedValue({ ...RUTAS, rutaId: 2, rutaNombre: 'RUTA SECUNDARIA' });
  // Ya confirmo la ruta en esta sesion: la mayoria de los casos arranca en el panel.
  sessionStorage.setItem('ecoruta_conductor_ruta_confirmada', '1');
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('Panel del conductor en ruta', () => {
  it('en camino muestra la proxima parada, quienes esperan y cuantos van a bordo', async () => {
    abrir();
    // El Mercado llega antes (2 min): es la proxima.
    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByText('2 esperan')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('21')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Llegué/ })).toBeTruthy();
    expect(screen.getByText('Vuelta 2')).toBeTruthy();
  });

  it('en la parada cuenta con Subió y Bajó, deshace y guarda el conteo al salir', async () => {
    vi.mocked(marcarParadaAtendida).mockResolvedValue({ reservasCerradas: 2, marcadaEn: '2026-09-23T15:05:00Z' });
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /Llegué/ }));

    expect(screen.getByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByText('2 avisaron por la app')).toBeTruthy();

    const subio = screen.getByRole('button', { name: /Subió/ });
    fireEvent.click(subio);
    fireEvent.click(subio);
    fireEvent.click(subio);
    fireEvent.click(screen.getByRole('button', { name: /Bajó/ }));
    fireEvent.click(screen.getByRole('button', { name: /Bajó/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer el último' }));

    expect(screen.getByRole('status').textContent).toBe('1 subió sin avisar por la app');

    fireEvent.click(screen.getByRole('button', { name: /Salir de la parada/ }));

    await screen.findByRole('heading', { name: 'Mercado: cerrada' });
    expect(marcarParadaAtendida).toHaveBeenCalledWith(1, 2, { subieron: 3, bajaron: 1 });
    // 12 a bordo al llegar + 3 - 1.
    expect(screen.getByText('14')).toBeTruthy();
    // Sigue la proxima pendiente, sin la que se acaba de cerrar.
    expect(screen.getByRole('button', { name: /Seguir la ruta/ }).textContent).toContain('Parque Central');
  });

  it('no pierde toques rapidos seguidos antes de que la pantalla se redibuje', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /Llegué/ }));
    const subio = screen.getByRole('button', { name: /Subió/ });
    act(() => {
      subio.click();
      subio.click();
      subio.click();
    });
    expect(screen.getByRole('status').textContent).toBe('1 subió sin avisar por la app');
  });

  it('si no se pudo guardar se queda en la parada y lo dice', async () => {
    vi.mocked(marcarParadaAtendida).mockRejectedValue(new ErrorApi(409, 'La parada ya fue marcada como atendida.'));
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /Llegué/ }));
    fireEvent.click(screen.getByRole('button', { name: /Salir de la parada/ }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/la cerraste hace un momento/);
    expect(screen.getByRole('button', { name: /Subió/ })).toBeTruthy();
  });

  it('el GPS detecta la llegada: bus detenido en la proxima parada', async () => {
    vi.mocked(obtenerPanelConductor).mockResolvedValue({
      ...PANEL,
      estadoBus: 'DETENIDO_EN_PARADA',
      paradas: PANEL.paradas.map((p) => (p.paradaId === 2 ? { ...p, minutos: 0 } : p)),
    });
    abrir();
    expect(await screen.findByText('Estás en la parada')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Subió/ })).toBeTruthy();
  });

  it('la lista de paradas deja elegir en cual esta y marca las cerradas', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Paradas' }));
    const lista = screen.getByRole('list', { name: 'Paradas del recorrido' });
    const filas = within(lista).getAllByRole('listitem');
    expect(within(filas[3]).getByText('Cerrada')).toBeTruthy();

    fireEvent.click(within(filas[0]).getByRole('button', { name: 'Estoy aquí' }));
    expect(screen.getByRole('heading', { name: 'Parque Central' })).toBeTruthy();
    expect(screen.getByText('3 avisaron por la app')).toBeTruthy();
  });

  it('reportar atraso se abre en una hoja aparte', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Reportar atraso' }));
    expect(screen.getByRole('dialog', { name: 'Reportar atraso' })).toBeTruthy();
    expect(screen.getByText('Formulario de atraso')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sin ruta asignada la elige ahi mismo y entra al panel', async () => {
    vi.mocked(obtenerPanelConductor)
      .mockRejectedValueOnce(new ErrorApi(403, 'No tenés una ruta asignada.'))
      .mockResolvedValue({ ...PANEL, rutaId: 2, rutaNombre: 'RUTA SECUNDARIA' });
    vi.mocked(obtenerRutaConductor).mockResolvedValue({ ...RUTAS, rutaId: null, rutaNombre: null });
    abrir();

    expect(await screen.findByRole('heading', { name: '¿Qué ruta vas a manejar hoy?' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /RUTA SECUNDARIA/ }));

    await waitFor(() => expect(elegirRutaConductor).toHaveBeenCalledWith(2));
    expect(await screen.findByRole('button', { name: 'Cambiar ruta. Ahora: RUTA SECUNDARIA' })).toBeTruthy();
  });

  it('al entrar confirma la ruta y ve el mapa junto a la proxima parada', async () => {
    sessionStorage.clear();
    abrir();

    expect(await screen.findByText('Hoy manejás')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'RUTA PRINCIPAL' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }));

    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByText('Mapa de RUTA PRINCIPAL')).toBeTruthy();
    expect(sessionStorage.getItem('ecoruta_conductor_ruta_confirmada')).toBe('1');
    expect(elegirRutaConductor).not.toHaveBeenCalled();
  });

  it('al entrar puede cambiar de ruta antes de empezar', async () => {
    sessionStorage.clear();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar ruta' }));

    const actual = await screen.findByRole('button', { name: /RUTA PRINCIPAL/ });
    expect(actual.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /RUTA SECUNDARIA/ }));

    await waitFor(() => expect(elegirRutaConductor).toHaveBeenCalledWith(2));
    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeTruthy();
  });

  it('en la jornada cambia de ruta tocando su nombre en la barra', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar ruta. Ahora: RUTA PRINCIPAL' }));

    const hoja = screen.getByRole('dialog', { name: 'Cambiar de ruta' });
    fireEvent.click(await within(hoja).findByRole('button', { name: /RUTA SECUNDARIA/ }));

    await waitFor(() => expect(elegirRutaConductor).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(obtenerPanelConductor).toHaveBeenCalledTimes(2));
  });

  it('con el bus en una parada, esa es la que propone aunque otra llegue antes por el orden', async () => {
    // A 10 m de El Calvario; el Mercado (2 min) seria la proxima por tiempo.
    posicionDelBus.mockReturnValue({
      latitud: 14.6306,
      longitud: -89.99281,
      velocidadKmh: 12,
      timestamp: new Date().toISOString(),
      vehiculo: 'BUS-01',
    });
    abrir();

    expect(await screen.findByRole('heading', { name: 'El Calvario' })).toBeTruthy();
    expect(screen.getByText('Estás aquí')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Llegué/ }));
    expect(await screen.findByRole('heading', { name: 'El Calvario' })).toBeTruthy();
    expect(screen.getByText('Estás en la parada')).toBeTruthy();
  });

  it('lejos de toda parada o con la posicion vieja, propone la proxima del recorrido', async () => {
    posicionDelBus.mockReturnValue({
      latitud: 14.6306,
      longitud: -89.99281,
      velocidadKmh: 12,
      timestamp: new Date(Date.now() - 10 * 60_000).toISOString(),
      vehiculo: 'BUS-01',
    });
    abrir();

    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByText('Próxima parada')).toBeTruthy();
  });

  it('el bus detenido donde lo ubica el GPS abre la parada solo', async () => {
    vi.mocked(obtenerPanelConductor).mockResolvedValue({ ...PANEL, estadoBus: 'DETENIDO_EN_PARADA' });
    posicionDelBus.mockReturnValue({
      latitud: 14.6306,
      longitud: -89.99281,
      velocidadKmh: 0,
      timestamp: new Date().toISOString(),
      vehiculo: 'BUS-01',
    });
    abrir();

    expect(await screen.findByText('Estás en la parada')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'El Calvario' })).toBeTruthy();
  });

  it('si no se pudo cambiar de ruta lo dice y no cierra la hoja', async () => {
    vi.mocked(elegirRutaConductor).mockRejectedValue(new ErrorApi(422, 'Esa ruta no está publicada.'));
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar ruta. Ahora: RUTA PRINCIPAL' }));
    fireEvent.click(await screen.findByRole('button', { name: /RUTA SECUNDARIA/ }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Cambiar de ruta' })).toBeTruthy();
  });
});
