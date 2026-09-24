import { describe, expect, it } from 'vitest';
import { haceCuanto } from './formatoTiempo';

const AHORA = Date.parse('2026-09-23T18:00:00Z');
const antes = (minutos: number) => new Date(AHORA - minutos * 60_000).toISOString();

describe('haceCuanto (QA 5.7)', () => {
  it('menos de una hora: minutos', () => {
    expect(haceCuanto(antes(0), AHORA)).toBe('hace menos de 1 min');
    expect(haceCuanto(antes(1), AHORA)).toBe('hace 1 min');
    expect(haceCuanto(antes(59), AHORA)).toBe('hace 59 min');
  });

  it('desde una hora: horas y minutos, como pidio QA', () => {
    expect(haceCuanto(antes(60), AHORA)).toBe('hace 1 h');
    expect(haceCuanto(antes(75), AHORA)).toBe('hace 1 h 15 min');
    // El ejemplo del informe: 1070 min.
    expect(haceCuanto(antes(1070), AHORA)).toBe('hace 17 h 50 min');
  });

  it('desde un dia: dias y horas', () => {
    expect(haceCuanto(antes(24 * 60), AHORA)).toBe('hace 1 d');
    expect(haceCuanto(antes(51 * 60 + 20), AHORA)).toBe('hace 2 d 3 h');
  });

  it('un reloj adelantado no da tiempos negativos', () => {
    expect(haceCuanto(new Date(AHORA + 60_000).toISOString(), AHORA)).toBe('hace menos de 1 min');
  });
});
