import { describe, expect, it } from 'vitest';
import { ErrorApi, traducirError } from './errores';
import type { ApiError } from './tipos';

function apiError(parcial: Partial<ApiError> & Pick<ApiError, 'status' | 'message'>): ApiError {
  return {
    timestamp: '2026-08-20T00:00:00Z',
    error: 'Error',
    path: '/api/v1/ejemplo',
    ...parcial,
  };
}

describe('traducirError', () => {
  it('traduce 400 a un mensaje claro en espanol', () => {
    expect(traducirError(new ErrorApi(400, 'Bad Request'))).toBe('Los datos enviados no son validos.');
  });

  it('traduce 404 a un mensaje claro en espanol', () => {
    expect(traducirError(new ErrorApi(404, 'Not Found'))).toBe('No encontramos lo que buscabas.');
  });

  it('en 422 muestra la regla de negocio si viene en lenguaje claro', () => {
    const error = new ErrorApi(
      422,
      'Unprocessable Entity',
      apiError({
        status: 422,
        message: 'Debes estar a menos de 150 m de la parada para registrarte',
      }),
    );
    expect(traducirError(error)).toBe('Debes estar a menos de 150 m de la parada para registrarte');
  });

  it('en 422 con mensaje tecnico usa el fallback de negocio', () => {
    const error = new ErrorApi(
      422,
      'Unprocessable Entity',
      apiError({ status: 422, message: 'Unprocessable Entity' }),
    );
    expect(traducirError(error)).toBe('No se pudo completar la accion.');
  });

  it('usa el mensaje generico cuando el codigo no esta contemplado', () => {
    expect(traducirError(new ErrorApi(418, "I'm a teapot"))).toBe('Algo salio mal. Intenta de nuevo.');
  });

  it('no expone el codigo HTTP ni el texto en ingles al usuario', () => {
    const texto = traducirError(new ErrorApi(404, '404 Not Found'));
    expect(texto).not.toMatch(/\d{3}/);
    expect(texto).not.toMatch(/Not Found/i);
    expect(texto).not.toMatch(/Error:/i);
  });

  it('traduce una falla de red (status 0) sin mencionar fetch ni TypeError', () => {
    const texto = traducirError(new ErrorApi(0, 'Fallo de red: TypeError: Failed to fetch'));
    expect(texto).toBe('Sin datos nuevos: revisa tu conexion e intenta de nuevo.');
    expect(texto).not.toMatch(/fetch|TypeError|Failed/i);
  });

  it('agrupa 5xx en un aviso de servicio no disponible', () => {
    expect(traducirError(new ErrorApi(503, 'Service Unavailable'))).toBe(
      'El servicio no esta disponible en este momento. Intenta mas tarde.',
    );
  });

  it('traduce 401 y 403 sin mostrar el codigo', () => {
    expect(traducirError(new ErrorApi(401, 'Unauthorized'))).toBe(
      'No tienes permiso para hacer esto.',
    );
    expect(traducirError(new ErrorApi(403, 'Forbidden'))).toBe(
      'No tienes permiso para hacer esto.',
    );
  });

  it('traduce 429 a un aviso de espera', () => {
    expect(traducirError(new ErrorApi(429, 'Too Many Requests'))).toBe(
      'Demasiados intentos. Espera un momento.',
    );
  });

  it('en 422 descarta un mensaje en ingles tecnico', () => {
    const error = new ErrorApi(
      422,
      'Unprocessable Entity',
      apiError({ status: 422, message: 'Unprocessable entity: geofence exceeded' }),
    );
    expect(traducirError(error)).toBe('No se pudo completar la accion.');
  });
});
