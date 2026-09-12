import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerIdDispositivo } from '../../../src/core/identidadDispositivo';

describe('SCRUM-254 - Identificador del dispositivo', () => {
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
      randomUUID: vi.fn(
        () => '11111111-1111-4111-8111-111111111111',
      ),
    });
  });

  it('genera y guarda un identificador cuando no existe', () => {
    const id = obtenerIdDispositivo();

    expect(id).toBe('11111111-1111-4111-8111-111111111111');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('reutiliza el mismo identificador en llamadas posteriores', () => {
    const primero = obtenerIdDispositivo();
    const segundo = obtenerIdDispositivo();

    expect(segundo).toBe(primero);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });
});