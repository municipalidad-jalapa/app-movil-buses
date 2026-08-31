import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../src/core/apiClient';
import {
  registrarDemanda,
  RUTA_REGISTRO_DEMANDA,
} from '../../../src/core/registroDemanda';

vi.mock('../../../src/core/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('SCRUM-255 - Registro de demanda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia dispositivo, parada y coordenadas al endpoint de demanda', async () => {
    const solicitud = {
      dispositivoId: 'dispositivo-prueba',
      paradaId: 3,
      latitud: 14.6335,
      longitud: -89.9885,
    };

    const respuesta = {
      id: 10,
      paradaId: 3,
      estado: 'ACTIVA',
      expiraEn: '2026-08-30T18:00:00',
    };

    vi.mocked(apiClient.post).mockResolvedValue(respuesta);

    const resultado = await registrarDemanda(solicitud);

    expect(apiClient.post).toHaveBeenCalledWith(
      RUTA_REGISTRO_DEMANDA,
      solicitud,
    );

    expect(resultado).toEqual(respuesta);
  });
});