import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  apiClient,
} from './apiClient';

import {
  obtenerEtaSimulado,
  type EtaRuta,
} from './eta';

import {
  obtenerEta,
} from './etaApi';

import type {
  Ruta,
} from './tipos';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('./eta', () => ({
  obtenerEtaSimulado:
    vi.fn(),
}));

describe('obtenerEta', () => {

  const ruta = {
    id: 7,
  } as Ruta;

  const respuesta: EtaRuta = {
    rutaId: 7,
    vehiculoId: 1,
    calculadoEn:
      '2026-09-15T05:00:00Z',

    paradas: [
      {
        paradaId: 1,
        orden: 1,
        minutos: 5,
        confiable: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa el simulador cuando el flag esta activo', async () => {

    vi.mocked(
      obtenerEtaSimulado,
    ).mockResolvedValue(
      respuesta,
    );

    const resultado =
      await obtenerEta(
        ruta,
        null,
        true,
      );

    expect(
      obtenerEtaSimulado,
    ).toHaveBeenCalledWith(
      ruta,
      null,
    );

    expect(
      apiClient.get,
    ).not.toHaveBeenCalled();

    expect(resultado)
      .toEqual(respuesta);
  });

  it('usa apiClient cuando el simulador esta apagado', async () => {

    vi.mocked(
      apiClient.get,
    ).mockResolvedValue(
      respuesta,
    );

    const resultado =
      await obtenerEta(
        ruta,
        null,
        false,
      );

    expect(
      apiClient.get,
    ).toHaveBeenCalledWith(
      '/api/v1/rutas/7/eta',
    );

    expect(
      obtenerEtaSimulado,
    ).not.toHaveBeenCalled();

    expect(resultado)
      .toEqual(respuesta);
  });
});