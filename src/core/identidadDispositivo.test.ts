import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerIdDispositivo } from './identidadDispositivo';

describe('obtenerIdDispositivo', () => {
  const almacenamiento = new Map<string, string>();

  beforeEach(() => {
    almacenamiento.clear();

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((clave: string) => almacenamiento.get(clave) ?? null),
      setItem: vi.fn((clave: string, valor: string) => {
        almacenamiento.set(clave, valor);
      }),
    });

    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => '11111111-1111-4111-8111-111111111111'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('genera y guarda un identificador cuando no existe', () => {
    const id = obtenerIdDispositivo();

    expect(id).toBe('11111111-1111-4111-8111-111111111111');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'ecoruta_dispositivo_id',
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('reutiliza el mismo identificador en llamadas posteriores', () => {
    const primero = obtenerIdDispositivo();
    const segundo = obtenerIdDispositivo();

    expect(segundo).toBe(primero);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });
});