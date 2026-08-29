// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

afterEach(cleanup);
import { HoraUltimoDato } from './HoraUltimoDato';

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
});
