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

const entornoMensajeria = {
  VITE_FIREBASE_API_KEY: 'llave',
  VITE_FIREBASE_AUTH_DOMAIN: 'ecoruta.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'ecoruta',
  VITE_FIREBASE_STORAGE_BUCKET: 'ecoruta.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
  VITE_FIREBASE_APP_ID: '1:123456:web:abc',
  VITE_FIREBASE_VAPID_KEY: 'vapid',
};

describe('configuracion de avisos', () => {
  it('deja los avisos apagados si no hay ninguna variable de Firebase', () => {
    const resultado = leerConfiguracion(entornoValido);

    expect(resultado.mensajeria).toBeNull();
  });

  it('arma la configuracion cuando estan las siete', () => {
    const resultado = leerConfiguracion({ ...entornoValido, ...entornoMensajeria });

    expect(resultado.mensajeria).toEqual({
      apiKey: 'llave',
      authDomain: 'ecoruta.firebaseapp.com',
      projectId: 'ecoruta',
      storageBucket: 'ecoruta.appspot.com',
      messagingSenderId: '123456',
      appId: '1:123456:web:abc',
      vapidKey: 'vapid',
    });
  });

  it('falla nombrando lo que falta si el .env quedo a medias', () => {
    const { VITE_FIREBASE_VAPID_KEY: _omitida, ...incompleto } = entornoMensajeria;

    expect(() => leerConfiguracion({ ...entornoValido, ...incompleto })).toThrow(
      /VITE_FIREBASE_VAPID_KEY/,
    );
  });

  it('trata una variable vacia como ausente', () => {
    expect(() =>
      leerConfiguracion({
        ...entornoValido,
        ...entornoMensajeria,
        VITE_FIREBASE_APP_ID: '   ',
      }),
    ).toThrow(/VITE_FIREBASE_APP_ID/);
  });
});

describe('simulacion de abordaje', () => {
  it('esta apagada por defecto', () => {
    expect(leerConfiguracion(entornoValido).simularAbordaje).toBe(false);
  });

  it('solo se enciende con el texto exacto "true"', () => {
    expect(
      leerConfiguracion({ ...entornoValido, VITE_SIMULAR_ABORDAJE: 'true' }).simularAbordaje,
    ).toBe(true);
    expect(leerConfiguracion({ ...entornoValido, VITE_SIMULAR_ABORDAJE: '1' }).simularAbordaje).toBe(
      false,
    );
  });
});

describe('config', () => {
  it('queda validada y congelada al cargar el modulo', () => {
    expect(config.apiBaseUrl).toBe('https://api.ejemplo.test');
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('corre sin Firebase configurado, como en CI', () => {
    expect(config.mensajeria).toBeNull();
  });
});
