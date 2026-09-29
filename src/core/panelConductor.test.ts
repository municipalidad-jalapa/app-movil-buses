import { describe, expect, it } from 'vitest';
import {
  paradaDondeEstaElBus,
  posicionVigente,
  proximaParada,
  proximaPendiente,
  textoEstado,
  textoLlegada,
  totalEsperando,
  type ParadaDelPanel,
} from './panelConductor';

function parada(extra: Partial<ParadaDelPanel> = {}): ParadaDelPanel {
  return {
    paradaId: 1,
    nombre: 'Parque Central',
    orden: 1,
    reservasActivas: 0,
    minutos: 5,
    confiable: true,
    atendidaEn: null,
    ...extra,
  };
}

describe('panel del conductor: presentacion (QA 5.3)', () => {
  it('muestra los minutos, con ≈ si el calculo es aproximado', () => {
    expect(textoLlegada(parada(), 'EN_RUTA')).toBe('5 min');
    expect(textoLlegada(parada({ confiable: false }), 'EN_RUTA')).toBe('≈ 5 min');
    expect(textoLlegada(parada(), 'EN_DESVIO')).toBe('≈ 5 min');
    expect(textoLlegada(parada({ minutos: 0 }), 'EN_RUTA')).toBe('Llegando');
  });

  it('sin minutos dice por que, nunca inventa un numero', () => {
    expect(textoLlegada(parada({ minutos: null }), 'SIN_DATOS')).toBe('Sin ubicación del bus');
    expect(textoLlegada(parada({ minutos: null }), 'DETENIDO_FUERA_DE_PARADA')).toBe('Bus detenido');
    expect(textoLlegada(parada({ minutos: null }), 'EN_RUTA')).toBe('Sin estimación');
  });

  it('una parada atendida lo dice con texto y hora', () => {
    const atendida = parada({ atendidaEn: '2026-09-23T15:04:00Z' });
    expect(textoLlegada(atendida, 'EN_RUTA')).toBe('Ya pasaste por aquí');
    expect(textoEstado(atendida)).toMatch(/^Atendida \d{2}:\d{2}$/);
    expect(textoEstado(parada())).toBe('Pendiente');
  });

  it('la proxima parada es la pendiente con menos minutos', () => {
    const paradas = [
      parada({ paradaId: 1, minutos: 9 }),
      parada({ paradaId: 2, minutos: 2 }),
      parada({ paradaId: 3, minutos: 1, atendidaEn: '2026-09-23T15:00:00Z' }),
    ];
    expect(proximaPendiente(paradas)?.paradaId).toBe(2);
    expect(proximaPendiente([parada({ minutos: null, paradaId: 7 })])?.paradaId).toBe(7);
  });

  it('el total de esperando no cuenta paradas ya atendidas', () => {
    expect(
      totalEsperando([
        parada({ reservasActivas: 3 }),
        parada({ reservasActivas: 2, atendidaEn: '2026-09-23T15:00:00Z' }),
        parada({ reservasActivas: 1 }),
      ]),
    ).toBe(4);
  });
});

describe('panel del conductor: en que parada esta el bus', () => {
  // Ida y vuelta por calles paralelas: la 2 y la 7 quedan a ~165 m una de otra.
  const ubicaciones = new Map([
    [2, { latitud: 14.632649, longitud: -89.986805 }],
    [3, { latitud: 14.630572, longitud: -89.992877 }],
    [7, { latitud: 14.631173, longitud: -89.987091 }],
  ]);
  const paradas = [
    parada({ paradaId: 2, orden: 2, minutos: 3 }),
    parada({ paradaId: 3, orden: 3, minutos: 9 }),
    parada({ paradaId: 7, orden: 7, minutos: 20 }),
  ];

  it('dentro del radio elige la parada donde esta el bus, aunque no sea la siguiente', () => {
    const junto3 = { latitud: 14.6306, longitud: -89.9929 };
    expect(proximaParada(paradas, ubicaciones, junto3)?.paradaId).toBe(3);
  });

  it('no confunde la parada de vuelta con la de ida', () => {
    const junto7 = { latitud: 14.63125, longitud: -89.98705 };
    expect(paradaDondeEstaElBus(paradas, ubicaciones, junto7)?.paradaId).toBe(7);
    // A mitad de camino entre la 2 y la 7 no esta en ninguna: manda el recorrido.
    const enMedio = { latitud: 14.63191, longitud: -89.98695 };
    expect(paradaDondeEstaElBus(paradas, ubicaciones, enMedio)).toBeNull();
    expect(proximaParada(paradas, ubicaciones, enMedio)?.paradaId).toBe(2);
  });

  it('ignora las paradas ya cerradas y sin ubicacion conocida', () => {
    const cerrada = [parada({ paradaId: 3, atendidaEn: '2026-09-26T15:00:00Z' }), parada({ paradaId: 9 })];
    const junto3 = { latitud: 14.6306, longitud: -89.9929 };
    expect(paradaDondeEstaElBus(cerrada, ubicaciones, junto3)).toBeNull();
  });

  it('sin posicion del bus usa la proxima del recorrido', () => {
    expect(proximaParada(paradas, ubicaciones, null)?.paradaId).toBe(2);
  });

  it('una posicion de hace mas de 2 minutos ya no ubica al bus', () => {
    const ahora = Date.parse('2026-09-26T15:10:00Z');
    const bus = { latitud: 1, longitud: 1, velocidadKmh: 0, vehiculo: 'BUS-01' };
    expect(posicionVigente({ ...bus, timestamp: '2026-09-26T15:09:00Z' }, ahora)).not.toBeNull();
    expect(posicionVigente({ ...bus, timestamp: '2026-09-26T15:07:00Z' }, ahora)).toBeNull();
  });
});
