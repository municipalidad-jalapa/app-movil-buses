import { useEffect, useState } from 'react';

import {
  obtenerEstadoEta,
  obtenerEtaSimulado,
  type EstadoEta,
} from '../core/eta';

import type {
  Posicion,
  Ruta,
} from '../core/tipos';

interface ResultadoUseEta {
  estadoEta: EstadoEta | null;
  cargando: boolean;
}

/**
 * HU-74.
 *
 * Recalcula automaticamente el ETA
 * cada vez que llega una nueva
 * posicion del bus.
 */
export function useEta(
  ruta: Ruta | null,
  paradaId: number | null,
  posicionBus: Posicion | null,
): ResultadoUseEta {
  const [
    estadoEta,
    setEstadoEta,
  ] = useState<EstadoEta | null>(
    null,
  );

  const [
    cargando,
    setCargando,
  ] = useState(false);

  useEffect(() => {
    if (
      ruta === null ||
      paradaId === null
    ) {
      setEstadoEta(null);
      setCargando(false);
      return;
    }

    const rutaActual =
      ruta;

    const paradaActualId =
      paradaId;

    const posicionActual =
      posicionBus;

    let vigente = true;

    async function actualizarEta() {
      setCargando(true);

      try {
        const eta =
          await obtenerEtaSimulado(
            rutaActual,
            posicionActual,
          );

        if (!vigente) {
          return;
        }

        setEstadoEta(
          obtenerEstadoEta(
            eta,
            paradaActualId,
            posicionActual !== null,
          ),
        );
      } finally {
        if (vigente) {
          setCargando(false);
        }
      }
    }

    void actualizarEta();

    return () => {
      vigente = false;
    };
  }, [
    ruta,
    paradaId,
    posicionBus,
  ]);

  return {
    estadoEta,
    cargando,
  };
}
