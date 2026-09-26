import { describe, expect, it } from 'vitest';
import { vistaOcupacion } from './ocupacion';

const AHORA = Date.parse('2026-09-25T15:00:00Z');
const hace = (min: number) => new Date(AHORA - min * 60_000).toISOString();

describe('vistaOcupacion', () => {
  it('con capacidad dice cuantos van y si hay lugar', () => {
    const v = vistaOcupacion({ aBordo: 12, capacidad: 30, nivel: 'HAY_LUGAR', actualizadaEn: hace(3) }, AHORA);
    expect(v).toEqual({
      cantidad: '12',
      texto: 'Hay lugar',
      tono: 'lugar',
      frase: 'Lleva 12 personas · hay lugar',
      detalle: 'Según el conductor, hace 3 min',
    });
  });

  it('sin capacidad cargada dice solo cuantos van', () => {
    const v = vistaOcupacion({ aBordo: 1, capacidad: null, nivel: null, actualizadaEn: hace(0) }, AHORA);
    expect(v.texto).toBe('a bordo');
    expect(v.tono).toBe('neutro');
    expect(v.frase).toBe('Lleva 1 persona');
    expect(v.detalle).toBe('Según el conductor, hace menos de 1 min');
  });

  it('sin conteo, o con uno viejo, no inventa un numero', () => {
    expect(vistaOcupacion(null, AHORA).cantidad).toBe('—');
    const viejo = vistaOcupacion({ aBordo: 20, capacidad: 30, nivel: 'CASI_LLENO', actualizadaEn: hace(50) }, AHORA);
    expect(viejo.texto).toBe('Sin dato');
    expect(viejo.tono).toBe('sin');
  });
});
