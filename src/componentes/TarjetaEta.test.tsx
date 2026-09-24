// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { EtaRuta } from '../core/tipos';
import { TarjetaEta, leerEta } from './TarjetaEta';

afterEach(cleanup);

function eta(extra: Partial<EtaRuta> = {}, minutos: number | null = 6, confiable = true): EtaRuta {
  return {
    rutaId: 1,
    vehiculoId: 1,
    calculadoEn: '2026-09-23T15:00:00Z',
    estado: 'EN_RUTA',
    desvio: null,
    paradas: [{ paradaId: 2, orden: 2, minutos, confiable }],
    ...extra,
  };
}

describe('TarjetaEta (QA 5.1)', () => {
  it('con velocidad observada: minutos y "calculo confiable" con tres barras', () => {
    render(<TarjetaEta eta={eta()} paradaId={2} />);
    expect(screen.getByText('Llega a tu parada en')).toBeTruthy();
    expect(screen.getByText('6 min')).toBeTruthy();
    expect(screen.getByText('cálculo confiable')).toBeTruthy();
  });

  it('sin velocidad propia lo marca como aproximado, nunca como error', () => {
    const lectura = leerEta(eta({}, 9, false), 2);
    expect(lectura).toMatchObject({ valor: '≈ 9 min', nivel: 2, confianza: 'cálculo aproximado' });
  });

  it('en desvio tambien es aproximado y lo dice', () => {
    const lectura = leerEta(eta({ estado: 'EN_DESVIO' }, 4, true), 2);
    expect(lectura.nivel).toBe(2);
    expect(lectura.confianza).toMatch(/desvío/);
  });

  it('sin minutos explica por que no hay estimacion', () => {
    expect(leerEta(eta({ estado: 'SIN_DATOS' }, null, false), 2)).toMatchObject({
      rotulo: 'Todavía no podemos calcularlo',
      valor: 'El bus no está enviando su ubicación',
      nivel: 1,
    });
    expect(leerEta(eta({ estado: 'SIN_DATOS', vehiculoId: null }, null, false), 2).valor).toBe(
      'La ruta no tiene bus asignado',
    );
    expect(leerEta(eta({ estado: 'DETENIDO_FUERA_DE_PARADA' }, null, false), 2).valor).toBe('El bus está detenido');
  });

  it('una parada que no esta entre las pendientes: el bus ya paso', () => {
    expect(leerEta(eta(), 99).valor).toBe('El bus ya pasó por aquí en esta vuelta');
  });

  it('con cero minutos dice que esta llegando', () => {
    expect(leerEta(eta({}, 0, true), 2).valor).toBe('llegando');
  });
});
