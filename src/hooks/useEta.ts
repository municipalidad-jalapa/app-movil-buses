import {
  useEffect,
  useState,
} from 'react';

import {
  obtenerEstadoEta,
  type EstadoEta,
} from '../core/eta';

import {
  obtenerEta,
} from '../core/etaApi';

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
 * cada vez que cambia la ruta, parada
 * o posicion del bus.
 *
 * La fuente de datos se selecciona
 * mediante configuracion y no esta
 * hardcodeada en el hook.
 */
export function useEta(
  ruta: Ruta | null,
  paradaId: number | null,
  posicionBus: Posicion | null,
): ResultadoUseEta {

  const [
    estadoEta,
    setEstadoEta,
  ] =
    useState<EstadoEta | null>(null);

  const [
    cargando,
    setCargando,
  ] =
    useState(false);

  useEffect(() => {

    if (
      ruta === null ||
      paradaId === null
    ) {
      setEstadoEta(null);
      setCargando(false);
      return;
    }

    const rutaActual = ruta;

    const paradaActualId =
      paradaId;

    const posicionActual =
      posicionBus;

    let vigente = true;

    async function actualizarEta() {

      setCargando(true);

      try {

        const eta =
          await obtenerEta(
            rutaActual,
            posicionActual,
          );

        if (!vigente) {
          return;
        }

        if (eta === null) {
          setEstadoEta({
            tipo: 'sin-datos',
          });

          return;
        }

        setEstadoEta(
          obtenerEstadoEta(
            eta,
            paradaActualId,
            posicionActual !== null,
          ),
        );

      } catch {

        if (vigente) {
          setEstadoEta({
            tipo: 'sin-datos',
          });
        }

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