import { describe, expect, it } from 'vitest';
import { proximaPendiente, textoEstado, textoLlegada, totalEsperando, type ParadaDelPanel } from './panelConductor';

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
