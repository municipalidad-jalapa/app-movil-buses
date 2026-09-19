import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAVE_JWT_CONDUCTOR } from '../apiClient';
import {
  borrarSesion,
  guardarSesion,
  leerSesion,
  sesionSigueVigente,
  type SesionConductor,
} from './sesionConductor';

const sesion: SesionConductor = {
  token: 'jwt-conductor',
  expiraEn: 1_900_000_000,
  rol: 'conductor',
};

describe('sesionConductor', () => {
  const memoria = new Map<string, string>();

  beforeEach(() => {
    memoria.clear();
    vi.stubGlobal('localStorage', {
      getItem: (clave: string) => memoria.get(clave) ?? null,
      setItem: (clave: string, valor: string) => {
        memoria.set(clave, valor);
      },
      removeItem: (clave: string) => {
        memoria.delete(clave);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guarda y lee la sesion como JSON bajo ecoruta_jwt', () => {
    guardarSesion(sesion);

    expect(leerSesion()).toEqual(sesion);
    expect(memoria.get(CLAVE_JWT_CONDUCTOR)).toContain('jwt-conductor');
  });

  it('borra la sesion persistida', () => {
    guardarSesion(sesion);
    borrarSesion();

    expect(leerSesion()).toBeNull();
  });

  it('trata un JWT crudo legado como token sin expiracion', () => {
    memoria.set(CLAVE_JWT_CONDUCTOR, 'jwt-suelto');

    expect(leerSesion()).toEqual({ token: 'jwt-suelto', expiraEn: 0, rol: '' });
  });

  it('considera vigente solo si expiraEn esta en el futuro', () => {
    expect(sesionSigueVigente(sesion, 1_800_000_000_000)).toBe(true);
    expect(sesionSigueVigente(sesion, 1_900_000_000_001)).toBe(false);
  });
});
