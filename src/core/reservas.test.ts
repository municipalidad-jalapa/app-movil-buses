import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './apiClient';
import { ErrorApi } from './errores';
import { confirmarAbordaje, esReservaInactiva, rutaDeAbordaje } from './reservas';

vi.mock('./apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('rutaDeAbordaje', () => {
  it('arma la ruta del contrato de HU-58', () => {
    expect(rutaDeAbordaje(42)).toBe('/api/v1/reservas/42/abordaje');
  });
});

describe('confirmarAbordaje', () => {
  it('manda subio true y devuelve el estado ABORDO', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 7, estado: 'ABORDO' });

    await expect(confirmarAbordaje(7, true)).resolves.toEqual({ id: 7, estado: 'ABORDO' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/reservas/7/abordaje', { subio: true });
  });

  it('manda subio false y devuelve el estado CANCELADA', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 7, estado: 'CANCELADA' });

    await expect(confirmarAbordaje(7, false)).resolves.toEqual({ id: 7, estado: 'CANCELADA' });
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/reservas/7/abordaje', { subio: false });
  });

  it('propaga el error si el backend responde 422', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new ErrorApi(422, 'La reserva ya no esta activa'));

    await expect(confirmarAbordaje(7, true)).rejects.toBeInstanceOf(ErrorApi);
  });

  it('falla si la respuesta viene vacia: 204 no es un resultado valido aca', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(null);

    await expect(confirmarAbordaje(7, true)).rejects.toThrow(/no devolvio una respuesta/);
  });
});

describe('esReservaInactiva', () => {
  it('reconoce el 422 del contrato', () => {
    expect(esReservaInactiva(new ErrorApi(422, 'La reserva ya no esta activa'))).toBe(true);
  });

  it('no confunde otros errores con una reserva vencida', () => {
    expect(esReservaInactiva(new ErrorApi(500, 'Boom'))).toBe(false);
    expect(esReservaInactiva(new Error('cualquier cosa'))).toBe(false);
    expect(esReservaInactiva(null)).toBe(false);
  });
});
