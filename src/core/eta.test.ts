import { describe, expect, it } from 'vitest';

import {
  obtenerEstadoEta,
  obtenerEtaSimulado,
} from './eta';

import type {
  Posicion,
  Ruta,
} from './tipos';

/**
 * Ruta de prueba circular.
 *
 * Los identificadores son intencionalmente diferentes
 * para comprobar que HU-74 no depende de IDs fijos.
 */
const RUTA: Ruta = {
  id: 77,
  nombre: 'Ruta de prueba',
  activa: true,

  paradas: [
    {
      id: 101,
      nombre: 'Parada A',
      latitud: 14.63,
      longitud: -89.98,
      orden: 1,
    },
    {
      id: 205,
      nombre: 'Parada B',
      latitud: 14.63,
      longitud: -89.97,
      orden: 2,
    },
    {
      id: 999,
      nombre: 'Parada C',
      latitud: 14.64,
      longitud: -89.97,
      orden: 3,
    },
  ],

  trazado: [
    {
      latitud: 14.63,
      longitud: -89.98,
    },
    {
      latitud: 14.63,
      longitud: -89.97,
    },
    {
      latitud: 14.64,
      longitud: -89.97,
    },
    {
      latitud: 14.64,
      longitud: -89.98,
    },
    {
      latitud: 14.63,
      longitud: -89.98,
    },
  ],
};

function posicion(
  latitud: number,
  longitud: number,
  velocidadKmh: number | null = 20,
): Posicion {
  return {
    latitud,
    longitud,
    velocidadKmh,
    timestamp: '2026-09-11T19:00:00Z',
    vehiculo: 'BUS-PRUEBA',
  };
}

describe('HU-74 - ETA del bus', () => {
  it('calcula minutos para una parada usando posicion y velocidad del bus', async () => {
    const eta = await obtenerEtaSimulado(
      RUTA,
      posicion(
        14.63,
        -89.98,
        20,
      ),
    );

    const estado = obtenerEstadoEta(
      eta,
      205,
      true,
    );

    expect(estado.tipo).toBe('llegada');

    if (estado.tipo === 'llegada') {
      expect(estado.minutos).toBeGreaterThan(0);
      expect(estado.confiable).toBe(true);
    }
  });

  it('marca como aproximada una estimacion de mayor distancia', async () => {
    const eta = await obtenerEtaSimulado(
      RUTA,
      posicion(
        14.63,
        -89.98,
        20,
      ),
    );

    const estado = obtenerEstadoEta(
      eta,
      999,
      true,
    );

    expect(estado.tipo).toBe('llegada');

    if (estado.tipo === 'llegada') {
      expect(estado.minutos).toBeGreaterThan(0);
      expect(estado.confiable).toBe(false);
    }
  });

  it('muestra proxima salida cuando el bus todavia no ha iniciado', async () => {
    const eta =
      await obtenerEtaSimulado(
        RUTA,
        null,
      );

    const estado =
      obtenerEstadoEta(
        eta,
        101,
        false,
      );

    expect(estado.tipo).toBe(
      'proxima-salida',
    );

    if (
      estado.tipo ===
      'proxima-salida'
    ) {
      expect(
        estado.hora.length,
      ).toBeGreaterThan(0);
    }
  });

  it('indica que no conoce el tiempo cuando no hay velocidad disponible', async () => {
    const eta =
      await obtenerEtaSimulado(
        RUTA,
        posicion(
          14.63,
          -89.98,
          null,
        ),
      );

    const estado =
      obtenerEstadoEta(
        eta,
        205,
        true,
      );

    expect(estado.tipo).toBe(
      'sin-datos',
    );
  });

  it('reduce el ETA cuando el bus se acerca a la parada', async () => {
    const etaLejos =
      await obtenerEtaSimulado(
        RUTA,
        posicion(
          14.63,
          -89.98,
          20,
        ),
      );

    const etaCerca =
      await obtenerEtaSimulado(
        RUTA,
        posicion(
          14.63,
          -89.975,
          20,
        ),
      );

    const estadoLejos =
      obtenerEstadoEta(
        etaLejos,
        205,
        true,
      );

    const estadoCerca =
      obtenerEstadoEta(
        etaCerca,
        205,
        true,
      );

    expect(estadoLejos.tipo).toBe(
      'llegada',
    );

    expect(estadoCerca.tipo).toBe(
      'llegada',
    );

    if (
      estadoLejos.tipo === 'llegada' &&
      estadoCerca.tipo === 'llegada'
    ) {
      expect(
        estadoCerca.minutos,
      ).toBeLessThan(
        estadoLejos.minutos,
      );
    }
  });
});