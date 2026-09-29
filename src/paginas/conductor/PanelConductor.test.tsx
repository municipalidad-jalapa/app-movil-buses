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

/** A 10 m de El Calvario: el GPS lo ubica ahi aunque el Mercado llegue antes. */
function busEnElCalvario(minutosAtras = 0) {
  return {
    latitud: 14.6306,
    longitud: -89.99281,
    velocidadKmh: 0,
    timestamp: new Date(Date.now() - minutosAtras * 60_000).toISOString(),
    vehiculo: 'BUS-01',
  };
}

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
});
afterEach(cleanup);

describe('Panel del conductor en ruta', () => {
  it('entra directo a la parada con Subió y Bajó, sin paso de Llegué', async () => {
    abrir();
    // El Mercado llega antes (2 min): es la proxima.
    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByText('Próxima parada')).toBeTruthy();
    expect(screen.getByText('2 esperan')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('21')).toBeTruthy();
    expect(screen.getByText('Vuelta 2')).toBeTruthy();
    expect(screen.getByText('Mapa de RUTA PRINCIPAL')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subió. Van 0' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bajó. Van 0' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Llegué/ })).toBeNull();
    expect(screen.queryByText('Hoy manejás')).toBeNull();
  });

  it('cuenta, deshace y al pasar a la siguiente guarda el conteo y sigue con otra parada', async () => {
    vi.mocked(marcarParadaAtendida).mockResolvedValue({ reservasCerradas: 2, marcadaEn: '2026-09-23T15:05:00Z' });
    abrir();
    await screen.findByRole('heading', { name: 'Mercado' });

    const subio = screen.getByRole('button', { name: /^Subió/ });
    fireEvent.click(subio);
    fireEvent.click(subio);
    fireEvent.click(subio);
    fireEvent.click(screen.getByRole('button', { name: /^Bajó/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Bajó/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer el último' }));

    expect(screen.getByRole('button', { name: 'Subió. Van 3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bajó. Van 1' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('1 subió sin avisar por la app');
    // 12 a bordo + 3 - 1.
    expect(screen.getByText('14')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente parada' }));

    await waitFor(() => expect(marcarParadaAtendida).toHaveBeenCalledWith(1, 2, { subieron: 3, bajaron: 1 }));
    // Sigue la proxima pendiente, sin la que se acaba de cerrar, con el conteo en cero.
    expect(await screen.findByRole('heading', { name: 'Parque Central' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subió. Van 0' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Mercado cerrada: 3 subieron, 1 bajó.');
  });

  it('no pierde toques rapidos seguidos antes de que la pantalla se redibuje', async () => {
    abrir();
    const subio = await screen.findByRole('button', { name: /^Subió/ });
    act(() => {
      subio.click();
      subio.click();
      subio.click();
    });
    expect(screen.getByRole('status').textContent).toBe('1 subió sin avisar por la app');
  });

  it('si no se pudo guardar se queda en la parada con su conteo y lo dice', async () => {
    vi.mocked(marcarParadaAtendida).mockRejectedValue(new ErrorApi(409, 'La parada ya fue marcada como atendida.'));
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /^Subió/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente parada' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/la cerraste hace un momento/));
    expect(screen.getByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subió. Van 1' })).toBeTruthy();
  });

  it('presionar "Siguiente parada" varias veces seguidas no dispara pedidos duplicados', async () => {
    let resolver: (valor: { reservasCerradas: number; marcadaEn: string }) => void = () => {};
    vi.mocked(marcarParadaAtendida).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: /^Subió/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente parada' }));

    // Mientras la peticion esta en vuelo el boton queda deshabilitado ("Guardando…"):
    // tocarlo de nuevo no dispara un segundo pedido.
    const enVuelo = screen.getByRole('button', { name: 'Guardando…' }) as HTMLButtonElement;
    expect(enVuelo.disabled).toBe(true);
    fireEvent.click(enVuelo);
    fireEvent.click(enVuelo);

    await act(async () => {
      resolver({ reservasCerradas: 0, marcadaEn: '2026-09-23T15:05:00Z' });
    });

    expect(marcarParadaAtendida).toHaveBeenCalledTimes(1);
  });

  it('con el bus en una parada, esa es la que cuenta aunque otra llegue antes por el orden', async () => {
    posicionDelBus.mockReturnValue(busEnElCalvario());
    abrir();

    expect(await screen.findByRole('heading', { name: 'El Calvario' })).toBeTruthy();
    expect(screen.getByText('Estás aquí')).toBeTruthy();
  });

  it('lejos de toda parada o con la posicion vieja, propone la proxima del recorrido', async () => {
    posicionDelBus.mockReturnValue(busEnElCalvario(10));
    abrir();

    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByText('Próxima parada')).toBeTruthy();
  });

  it('al empezar a contar la parada queda fija aunque el GPS proponga otra', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <PanelConductor />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Subió/ }));
    expect(screen.getByRole('heading', { name: 'Mercado' })).toBeTruthy();

    posicionDelBus.mockReturnValue(busEnElCalvario());
    rerender(
      <MemoryRouter>
        <PanelConductor />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subió. Van 1' })).toBeTruthy();
  });

  it('la lista de paradas deja elegir en cual esta y marca las cerradas', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Paradas' }));
    const lista = screen.getByRole('list', { name: 'Paradas del recorrido' });
    const filas = within(lista).getAllByRole('listitem');
    expect(within(filas[3]).getByText('Cerrada')).toBeTruthy();
    expect(within(filas[1]).getByText('Aquí')).toBeTruthy();

    fireEvent.click(within(filas[0]).getByRole('button', { name: 'Estoy aquí' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Parque Central' })).toBeTruthy();
    expect(screen.getByText('Estás aquí')).toBeTruthy();
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

  it('en la jornada cambia de ruta tocando su nombre en la barra', async () => {
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar ruta. Ahora: RUTA PRINCIPAL' }));

    const hoja = screen.getByRole('dialog', { name: 'Cambiar de ruta' });
    fireEvent.click(await within(hoja).findByRole('button', { name: /RUTA SECUNDARIA/ }));

    await waitFor(() => expect(elegirRutaConductor).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(obtenerPanelConductor).toHaveBeenCalledTimes(2));
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
