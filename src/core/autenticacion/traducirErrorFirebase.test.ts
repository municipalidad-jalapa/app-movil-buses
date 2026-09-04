import { describe, expect, it } from 'vitest';
import {
  MENSAJE_CREDENCIALES_INVALIDAS,
  MENSAJE_SESION_CADUCADA,
  traducirErrorFirebase,
} from './traducirErrorFirebase';

describe('traducirErrorFirebase', () => {
  it('traduce credenciales invalidas sin exponer el code', () => {
    expect(traducirErrorFirebase({ code: 'auth/invalid-credential' })).toBe(
      MENSAJE_CREDENCIALES_INVALIDAS,
    );
    expect(traducirErrorFirebase({ code: 'auth/wrong-password' })).toBe(
      MENSAJE_CREDENCIALES_INVALIDAS,
    );
    expect(traducirErrorFirebase({ code: 'auth/user-not-found' })).not.toContain('auth/');
  });

  it('traduce demasiados intentos y fallos de red', () => {
    expect(traducirErrorFirebase({ code: 'auth/too-many-requests' })).toBe(
      'Demasiados intentos. Espera un momento.',
    );
    expect(traducirErrorFirebase({ code: 'auth/network-request-failed' })).toBe(
      'Sin datos nuevos: revisa tu conexion e intenta de nuevo.',
    );
  });

  it('usa un mensaje generico si el code no esta mapeado', () => {
    expect(traducirErrorFirebase({ code: 'auth/internal-error' })).toBe(
      'No se pudo iniciar sesión. Intenta de nuevo.',
    );
    expect(traducirErrorFirebase(new Error('boom'))).toBe(
      'No se pudo iniciar sesión. Intenta de nuevo.',
    );
  });

  it('expone el mensaje de sesion caducada para el login', () => {
    expect(MENSAJE_SESION_CADUCADA).toBe('Tu sesión caducó. Inicia sesión de nuevo.');
  });
});
