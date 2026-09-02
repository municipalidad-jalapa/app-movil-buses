import { describe, expect, it } from 'vitest';
import { config, leerConfiguracion } from './config';

const entornoValido = {
  VITE_API_BASE_URL: 'https://api.ejemplo.com',
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

  it('falla con un mensaje claro si la URL tiene formato invalido', () => {
    expect(() =>
      leerConfiguracion({
        VITE_API_BASE_URL: 'no-es-una-url',
      }),
    ).toThrow(/VITE_API_BASE_URL no es una URL valida/);
  });
});

describe('config', () => {
  it('queda validada y congelada al cargar el modulo', () => {
    expect(config.apiBaseUrl).toBe('https://api.ejemplo.test');
    expect(Object.isFrozen(config)).toBe(true);
  });
});
