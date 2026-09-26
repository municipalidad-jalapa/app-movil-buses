import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient';
import { ErrorApi } from './errores';
import {
  CABECERA_DISPOSITIVO,
  cancelarReserva,
  registrarDemanda,
  RUTA_REGISTRO_DEMANDA,
} from './registroDemanda';

vi.mock('./apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    delete: vi.fn(),
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

describe('cancelarReserva (HU-77 / SCRUM-172)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa DELETE /api/v1/reservas/{id} con X-Dispositivo-Id', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(null);

    await cancelarReserva(9, 'dispositivo');

    expect(apiClient.delete).toHaveBeenCalledWith(`${RUTA_REGISTRO_DEMANDA}/9`, {
      cabeceras: { [CABECERA_DISPOSITIVO]: 'dispositivo' },
    });
  });

  it('resuelve correctamente una respuesta 204 sin cuerpo', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(null);

    await expect(cancelarReserva(9, 'dispositivo')).resolves.toBeUndefined();
  });

  it('propaga los errores de apiClient.delete sin tratarlos como éxito', async () => {
    const fallo = new ErrorApi(422, 'Esta reserva ya fue marcada como abordada.');
    vi.mocked(apiClient.delete).mockRejectedValue(fallo);

    await expect(cancelarReserva(9, 'dispositivo')).rejects.toBe(fallo);
  });
});
