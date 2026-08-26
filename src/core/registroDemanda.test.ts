import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import {
  registrarDemanda,
  RUTA_REGISTRO_DEMANDA,
} from './registroDemanda';

vi.mock('./apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('registrarDemanda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia dispositivo, parada y coordenadas al endpoint de demanda', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      id: 15,
      paradaId: 3,
      estado: 'ACTIVA',
      expiraEn: '2026-08-26T10:30:00',
    });

    const solicitud = {
      dispositivoId: 'dispositivo-prueba',
      paradaId: 3,
      latitud: 14.6335,
      longitud: -89.9885,
    };

    const respuesta = await registrarDemanda(solicitud);

    expect(apiClient.post).toHaveBeenCalledWith(
      RUTA_REGISTRO_DEMANDA,
      solicitud,
    );

    expect(respuesta).toEqual({
      id: 15,
      paradaId: 3,
      estado: 'ACTIVA',
      expiraEn: '2026-08-26T10:30:00',
    });
  });
});