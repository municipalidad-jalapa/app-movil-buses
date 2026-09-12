// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

afterEach(cleanup);
import { HoraUltimoDato, formatearMomento } from './HoraUltimoDato';

describe('HoraUltimoDato', () => {
  it('muestra la hora del ultimo dato con numeros tabulares', () => {
    const recibidoEn = new Date('2026-08-21T20:47:00-06:00');
    render(<HoraUltimoDato recibidoEn={recibidoEn} />);

    const hora = document.querySelector('time');
    expect(hora).not.toBeNull();
    expect(hora?.getAttribute('datetime')).toBe(recibidoEn.toISOString());
    expect(document.querySelector('.hora-ultimo-dato time')).not.toBeNull();
    expect(document.body.textContent).toContain('Último dato');
  });

  it('un dato de otro dia lleva la fecha, no solo la hora (HU-60)', () => {
    const ahora = new Date(2026, 8, 10, 21, 5);
    const ayer = new Date(2026, 8, 9, 21, 57);
    const hoy = new Date(2026, 8, 10, 20, 50);
    expect(formatearMomento(hoy, ahora)).not.toMatch(/sept/);
    expect(formatearMomento(ayer, ahora)).toMatch(/^9 sept/);
  });
});
