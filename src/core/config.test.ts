import { describe, expect, it } from 'vitest';
import { config, leerConfiguracion, remitenteDelAppId } from './config';

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

describe('configuracion de avisos (HU-58)', () => {
  const mensajeria = {
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
    VITE_FIREBASE_VAPID_KEY: 'vapid',
  };

  it('deja los avisos apagados si no hay variables de mensajeria', () => {
    expect(leerConfiguracion(entornoValido).mensajeria).toBeNull();
  });

  it('reutiliza el proyecto de Firebase de la sesion del conductor', () => {
    const resultado = leerConfiguracion({ ...entornoValido, ...mensajeria });
    expect(resultado.mensajeria).toMatchObject({
      apiKey: entornoValido.VITE_FIREBASE_API_KEY,
      projectId: entornoValido.VITE_FIREBASE_PROJECT_ID,
      appId: entornoValido.VITE_FIREBASE_APP_ID,
      messagingSenderId: '123456',
      vapidKey: 'vapid',
    });
  });

  it('falla nombrando lo que falta si el .env quedo a medias', () => {
    expect(() =>
      leerConfiguracion({ ...entornoValido, VITE_FIREBASE_MESSAGING_SENDER_ID: '123456' }),
    ).toThrow(/VITE_FIREBASE_VAPID_KEY/);
  });

  it('QA 4.2: con solo la VAPID key deduce el remitente del appId', () => {
    const resultado = leerConfiguracion({
      ...entornoValido,
      VITE_FIREBASE_APP_ID: '1:848636628612:web:abc123',
      VITE_FIREBASE_VAPID_KEY: 'vapid',
    });
    expect(resultado.mensajeria?.messagingSenderId).toBe('848636628612');
  });

  it('lee el remitente de un appId web y nada de uno que no lo es', () => {
    expect(remitenteDelAppId('1:848636628612:web:abc')).toBe('848636628612');
    expect(remitenteDelAppId('1:123:web:abc')).toBe('123');
    expect(remitenteDelAppId('app-sin-formato')).toBeNull();
  });

  it('trata una variable vacia como ausente', () => {
    expect(() =>
      leerConfiguracion({ ...entornoValido, ...mensajeria, VITE_FIREBASE_VAPID_KEY: '   ' }),
    ).toThrow(/VITE_FIREBASE_VAPID_KEY/);
  });
});
