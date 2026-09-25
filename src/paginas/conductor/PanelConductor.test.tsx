// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorApi } from '../../core/errores';
import { marcarParadaAtendida, obtenerPanelConductor, type PanelConductor as Panel } from '../../core/panelConductor';
import { PanelConductor } from './PanelConductor';

vi.mock('../../core/autenticacion/useAuth', () => ({
  useAuth: () => ({ usuario: { correo: 'piloto@ecoruta.gt' }, rol: 'CONDUCTOR', cerrarSesion: vi.fn() }),
}));
vi.mock('../../core/panelConductor', async (original) => ({
  ...(await original<typeof import('../../core/panelConductor')>()),
  obtenerPanelConductor: vi.fn(),
  marcarParadaAtendida: vi.fn(),
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
  paradas: [
    { paradaId: 1, nombre: 'Parque Central', orden: 1, reservasActivas: 3, minutos: 8, confiable: true, atendidaEn: null },
    { paradaId: 2, nombre: 'Mercado', orden: 2, reservasActivas: 2, minutos: 2, confiable: true, atendidaEn: null },
    { paradaId: 3, nombre: 'El Calvario', orden: 3, reservasActivas: 0, minutos: 11, confiable: true, atendidaEn: null },
    { paradaId: 4, nombre: 'Terminal', orden: 4, reservasActivas: 0, minutos: null, confiable: false, atendidaEn: '2026-09-23T14:50:00Z' },
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
});
afterEach(cleanup);

describe('Panel del conductor en ruta', () => {
  it('en camino muestra la proxima parada, quienes esperan y cuantos van a bordo', async () => {
    abrir();
    // El Mercado llega antes (2 min): es la proxima.
    expect(await screen.findByRole('heading', { name: 'Mercado' })).toBeTruthy();
    expect(screen.getByText('2 esperan')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('21')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Llegué/ })).toBeTruthy();
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

    expect((await screen.findByRole('alert')).textContent).toMatch(/ya estaba cerrada hoy/);
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

  it('sin ruta asignada explica el problema en lenguaje llano', async () => {
    vi.mocked(obtenerPanelConductor).mockRejectedValue(
      new ErrorApi(403, 'No tenés una ruta asignada. Pedile a la Municipalidad que te asigne una.'),
    );
    abrir();
    expect(await screen.findByText(/No tenés una ruta asignada/)).toBeTruthy();
  });
});
