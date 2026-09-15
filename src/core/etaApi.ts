import { apiClient } from './apiClient';
import { config } from './config';

import {
  obtenerEtaSimulado,
  type EtaRuta,
} from './eta';

import type {
  Posicion,
  Ruta,
} from './tipos';

/**
 * HU-74.
 *
 * Fuente unica de ETA para la aplicacion.
 *
 * El hook no necesita saber si el dato
 * viene del simulador o del backend real.
 */
export async function obtenerEta(
  ruta: Ruta,
  posicionBus: Posicion | null,
  usarSimulador: boolean =
    config.etaSimulado,
): Promise<EtaRuta | null> {

  if (usarSimulador) {
    return obtenerEtaSimulado(
      ruta,
      posicionBus,
    );
  }

  return apiClient.get<EtaRuta>(
    `/api/v1/rutas/${ruta.id}/eta`,
  );
}