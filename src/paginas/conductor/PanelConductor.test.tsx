// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const PANEL: Panel = {
  rutaId: 1,
  rutaNombre: 'Ruta de ejemplo - Centro de Jalapa',
  estadoBus: 'EN_RUTA',
  calculadoEn: '2026-09-23T15:00:00Z',
  paradas: [
    { paradaId: 1, nombre: 'Parque Central', orden: 1, reservasActivas: 3, minutos: 8, confiable: true, atendidaEn: null },
    { paradaId: 2, nombre: '1a Calle - Mercado', orden: 2, reservasActivas: 2, minutos: 2, confiable: false, atendidaEn: null },
    { paradaId: 3, nombre: 'El Calvario', orden: 3, reservasActivas: 0, minutos: null, confiable: false, atendidaEn: '2026-09-23T14:50:00Z' },
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

describe('Panel del conductor (QA 4.3 y 5.3)', () => {
  it('muestra su ruta y las paradas en el orden del recorrido con la gente que espera', async () => {
    abrir();
    expect(await screen.findByRole('heading', { name: PANEL.rutaNombre })).toBeTruthy();
    const filas = within(screen.getByRole('list', { name: 'Paradas del recorrido' })).getAllByRole('listitem');
    expect(filas.map((f) => within(f).getByText(/Parque|Mercado|Calvario/).textContent)).toEqual([
      'Parque Central',
      '1a Calle - Mercado',
      'El Calvario',
    ]);
    expect(within(filas[0]).getByText('3')).toBeTruthy();
    expect(within(filas[0]).getByText('8 min')).toBeTruthy();
    // El Mercado llega antes: es la proxima, y su ETA es aproximado.
    expect(within(filas[1]).getByText('Próxima parada')).toBeTruthy();
    expect(within(filas[1]).getByText('≈ 2 min')).toBeTruthy();
    expect(within(filas[2]).getByText(/^Atendida/)).toBeTruthy();
    expect(within(filas[2]).queryByRole('button', { name: 'Marcar atendida' })).toBeNull();
    expect(screen.getByText('5')).toBeTruthy(); // esperando en total, sin la atendida
  });

  it('marcar atendida pide confirmacion y cierra las reservas', async () => {
    vi.mocked(marcarParadaAtendida).mockResolvedValue({ reservasCerradas: 2, marcadaEn: '2026-09-23T15:05:00Z' });
    abrir();
    const fila = (await screen.findByText('1a Calle - Mercado', { selector: 'li p' })).closest('li')!;

    fireEvent.click(within(fila).getByRole('button', { name: 'Marcar atendida' }));
    expect(marcarParadaAtendida).not.toHaveBeenCalled();
    fireEvent.click(within(fila).getByRole('button', { name: 'Sí, ya subieron' }));

    await screen.findByText('Listo: 2 pasajeros abordaron.');
    expect(marcarParadaAtendida).toHaveBeenCalledWith(1, 2);
    await waitFor(() => expect(obtenerPanelConductor).toHaveBeenCalledTimes(2));
  });

  it('"Volver" cancela sin marcar', async () => {
    abrir();
    const fila = (await screen.findByText('Parque Central')).closest('li')!;
    fireEvent.click(within(fila).getByRole('button', { name: 'Marcar atendida' }));
    fireEvent.click(within(fila).getByRole('button', { name: 'Volver' }));
    expect(within(fila).getByRole('button', { name: 'Marcar atendida' })).toBeTruthy();
    expect(marcarParadaAtendida).not.toHaveBeenCalled();
  });

  it('sin ruta asignada explica el problema en lenguaje llano', async () => {
    vi.mocked(obtenerPanelConductor).mockRejectedValue(
      new ErrorApi(403, 'No tenés una ruta asignada. Pedile a la Municipalidad que te asigne una.'),
    );
    abrir();
    expect(await screen.findByText(/No tenés una ruta asignada/)).toBeTruthy();
  });
});
