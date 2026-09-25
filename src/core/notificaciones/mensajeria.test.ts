import { describe, expect, it } from 'vitest';
import { interpretarAviso } from './mensajeria';

describe('interpretarAviso (QA 4.2)', () => {
  it('entiende los tipos que manda el backend', () => {
    expect(interpretarAviso({ tipo: 'bus-cerca', reservaId: '7' })?.tipo).toBe('bus-cerca');
    expect(interpretarAviso({ tipo: 'confirmar-abordaje' })?.tipo).toBe('confirmar-abordaje');
    expect(interpretarAviso({ tipo: 'reserva-por-vencer' })?.tipo).toBe('reserva-por-vencer');
  });

  it('acepta los nombres viejos del enum para no dejar los avisos mudos', () => {
    expect(interpretarAviso({ tipo: 'APROXIMACION' })?.tipo).toBe('bus-cerca');
    expect(interpretarAviso({ tipo: 'LLEGADA', reservaId: '9' })).toMatchObject({
      tipo: 'confirmar-abordaje',
      reservaId: 9,
    });
    expect(interpretarAviso({ tipo: 'POR_VENCER' })?.tipo).toBe('reserva-por-vencer');
  });

  it('descarta lo que no es un aviso conocido', () => {
    expect(interpretarAviso({ tipo: 'otra-cosa' })).toBeNull();
    expect(interpretarAviso(undefined)).toBeNull();
  });
});
