import { describe, expect, it } from 'vitest';
import { config, leerConfiguracion } from './config';

const entornoValido = {
  VITE_API_BASE_URL: 'https://api.ejemplo.com',
  VITE_GOOGLE_MAPS_API_KEY: 'clave-de-prueba',
};

describe('leerConfiguracion', () => {
  it('devuelve apiBaseUrl y googleMapsApiKey cuando ambas variables son validas', () => {
    const resultado = leerConfiguracion(entornoValido);

    expect(resultado.apiBaseUrl).toBe('https://api.ejemplo.com');
    expect(resultado.googleMapsApiKey).toBe('clave-de-prueba');
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

  it('falla con un mensaje claro si falta una variable obligatoria', () => {
    expect(() =>
      leerConfiguracion({
        VITE_API_BASE_URL: 'https://api.ejemplo.com',
      }),
    ).toThrow(/Falta la variable VITE_GOOGLE_MAPS_API_KEY/);

    expect(() =>
      leerConfiguracion({
        VITE_GOOGLE_MAPS_API_KEY: 'clave-de-prueba',
      }),
    ).toThrow(/Falta la variable VITE_API_BASE_URL/);
  });

  it('falla con un mensaje claro si la URL tiene formato invalido', () => {
    expect(() =>
      leerConfiguracion({
        VITE_API_BASE_URL: 'no-es-una-url',
        VITE_GOOGLE_MAPS_API_KEY: 'clave-de-prueba',
      }),
    ).toThrow(/VITE_API_BASE_URL no es una URL valida/);
  });

  it('falla si la llave de Maps esta vacia', () => {
    expect(() =>
      leerConfiguracion({
        VITE_API_BASE_URL: 'https://api.ejemplo.com',
        VITE_GOOGLE_MAPS_API_KEY: '   ',
      }),
    ).toThrow(/VITE_GOOGLE_MAPS_API_KEY/);
  });
});

describe('config', () => {
  it('queda validada y congelada al cargar el modulo', () => {
    expect(config.apiBaseUrl).toBe('https://api.ejemplo.test');
    expect(config.googleMapsApiKey).toBe('clave-de-prueba-unitaria');
    expect(Object.isFrozen(config)).toBe(true);
  });
});
