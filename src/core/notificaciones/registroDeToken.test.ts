import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../apiClient';
import { obtenerIdDispositivo } from '../identidadDispositivo';
import { RUTA_REGISTRO_TOKEN, registrarTokenDelDispositivo } from './registroDeToken';

vi.mock('../apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

vi.mock('../identidadDispositivo', () => ({
  obtenerIdDispositivo: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('registrarTokenDelDispositivo', () => {
  it('asocia el token del navegador al dispositivo anonimo', async () => {
    vi.mocked(obtenerIdDispositivo).mockReturnValue('dispositivo-prueba');
    vi.mocked(apiClient.post).mockResolvedValue(null);

    await registrarTokenDelDispositivo('token-fcm');

    expect(apiClient.post).toHaveBeenCalledWith(RUTA_REGISTRO_TOKEN, {
      dispositivoId: 'dispositivo-prueba',
      tokenNotificacion: 'token-fcm',
    });
  });

  it('usa la ruta del contrato de HU-58', () => {
    expect(RUTA_REGISTRO_TOKEN).toBe('/api/v1/dispositivos/notificaciones');
  });

  it('acepta el 204 sin cuerpo que devuelve el backend', async () => {
    vi.mocked(obtenerIdDispositivo).mockReturnValue('dispositivo-prueba');
    vi.mocked(apiClient.post).mockResolvedValue(null);

    await expect(registrarTokenDelDispositivo('token-fcm')).resolves.toBeUndefined();
  });
});
