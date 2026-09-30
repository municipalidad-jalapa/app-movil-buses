// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { PanelConductor } from '../../core/panelConductor';
import type { Ruta } from '../../core/tipos';
import { MapaJalapa } from '../MapaJalapa';
import { MapaConductor } from './MapaConductor';

vi.mock('../MapaJalapa', () => ({ MapaJalapa: vi.fn(() => null) }));

afterEach(cleanup);

const RUTA: Ruta = { id: 2, nombre: 'RUTA SECUNDARIA', activa: true, paradas: [], trazado: [] };
const BUS = { latitud: 14.63, longitud: -89.98, velocidadKmh: 20, timestamp: '2026-09-26T15:00:00Z', vehiculo: 'BUS-02' };

const PANEL = {
  rutaId: 2,
  rutaNombre: 'RUTA SECUNDARIA',
  estadoBus: 'EN_RUTA',
  calculadoEn: '2026-09-26T15:00:00Z',
  paradas: [
    { paradaId: 5, nombre: 'Parque', orden: 1, reservasActivas: 3, minutos: 4, confiable: true, atendidaEn: null },
    { paradaId: 6, nombre: 'Mercado', orden: 2, reservasActivas: 0, minutos: 8, confiable: true, atendidaEn: null },
    { paradaId: 7, nombre: 'Terminal', orden: 3, reservasActivas: 2, minutos: null, confiable: false, atendidaEn: '2026-09-26T14:00:00Z' },
  ],
} as PanelConductor;

describe('Mapa del conductor', () => {
  it('dibuja la ruta y el bus en oscuro y cuenta solo las paradas pendientes', () => {
    render(<MapaConductor panel={PANEL} ruta={RUTA} posicion={BUS} />);

    const props = vi.mocked(MapaJalapa).mock.calls.at(-1)![0];
    expect(props.ruta).toBe(RUTA);
    expect(props.posicionBus).toBe(BUS);
    expect(props.modo).toBe('oscuro');
    expect([...props.esperandoPorParada!]).toEqual([[5, 3]]);
  });
});
