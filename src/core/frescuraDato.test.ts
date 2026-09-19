import { describe, expect, it } from 'vitest';
import { esRancio } from './frescuraDato';

const AHORA = Date.parse('2026-09-10T20:00:00Z');

describe('esRancio (HU-60)', () => {
  it('un dato de hace menos de 5 minutos esta fresco', () => {
    expect(esRancio({ timestamp: '2026-09-10T19:56:00Z' }, AHORA)).toBe(false);
  });

  it('justo 5 minutos todavia no es rancio', () => {
    expect(esRancio({ timestamp: '2026-09-10T19:55:00Z' }, AHORA)).toBe(false);
  });

  it('de mas de 5 minutos es rancio', () => {
    expect(esRancio({ timestamp: '2026-09-10T19:54:59Z' }, AHORA)).toBe(true);
  });

  it('sin posicion o con una hora ilegible no se declara rancio', () => {
    expect(esRancio(null, AHORA)).toBe(false);
    expect(esRancio({ timestamp: 'no es una fecha' }, AHORA)).toBe(false);
  });
});
