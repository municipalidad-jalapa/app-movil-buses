import { describe, expect, it } from 'vitest';
import { config, leerConfiguracion } from './config';

const entornoValido = {
  VITE_API_BASE_URL: 'https://api.ejemplo.com',
  VITE_FIREBASE_API_KEY: 'clave-firebase',
  VITE_FIREBASE_AUTH_DOMAIN: 'ecoruta.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'ecoruta',
  VITE_FIREBASE_APP_ID: '1:1:web:abc',
};

describe('leerConfiguracion', () => {
  it('devuelve apiBaseUrl cuando la variable es valida', () => {
    const resultado = leerConfiguracion(entornoValido);

    expect(resultado.apiBaseUrl).toBe('https://api.ejemplo.com');
    expect(Object.isFrozen(resultado)).toBe(true);
  });

  it('acepta una URL http de desarrollo local', () => {
    const resultado = leerConfiguracion({
      ...entornoValido,
      VITE_API_BASE_URL: 'http://localhost:8080',
    });

    expect(resultado.apiBaseUrl).toBe('http://localhost:8080');
  });

  it('quita la barra final de la URL para no duplicarla al concatenar rutas', () => {
    const resultado = leerConfiguracion({
      ...entornoValido,
      VITE_API_BASE_URL: 'https://api.ejemplo.com/',
    });

    expect(resultado.apiBaseUrl).toBe('https://api.ejemplo.com');
  });

  it('falla con un mensaje claro si falta la variable obligatoria', () => {
    expect(() => leerConfiguracion({})).toThrow(/Falta la variable VITE_API_BASE_URL/);
  });

  it('falla con un mensaje claro si falta una variable de Firebase', () => {
    expect(() =>
      leerConfiguracion({
        ...entornoValido,
        VITE_FIREBASE_API_KEY: '',
      }),
    ).toThrow(/Falta la variable VITE_FIREBASE_API_KEY/);
  });

  it('falla con un mensaje claro si la URL tiene formato invalido', () => {
    expect(() =>
      leerConfiguracion({
        ...entornoValido,
        VITE_API_BASE_URL: 'no-es-una-url',
      }),
    ).toThrow(/VITE_API_BASE_URL no es una URL valida/);
  });

  it('deja el simulador apagado si la variable no esta o no es true', () => {
    expect(leerConfiguracion(entornoValido).authConductorSimulado).toBe(false);
    expect(
      leerConfiguracion({
        ...entornoValido,
        VITE_AUTH_CONDUCTOR_SIMULADO: 'false',
      }).authConductorSimulado,
    ).toBe(false);
  });

  it('activa el simulador solo cuando la variable vale true', () => {
    const resultado = leerConfiguracion({
      ...entornoValido,
      VITE_AUTH_CONDUCTOR_SIMULADO: 'true',
    });

    expect(resultado.authConductorSimulado).toBe(true);
  });
});

describe('config', () => {
  it('queda validada y congelada al cargar el modulo', () => {
    expect(config.apiBaseUrl).toBe('https://api.ejemplo.test');
    expect(config.firebaseProjectId).toBe('ecoruta-prueba');
    expect(config.authConductorSimulado).toBe(false);
    expect(Object.isFrozen(config)).toBe(true);
  });
});
