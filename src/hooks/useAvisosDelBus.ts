import { useEffect, useState } from 'react';

import {
  escucharAvisosDelServiceWorker,
  escucharAvisosEnPrimerPlano,
} from '../core/notificaciones/mensajeria';
import type { AvisoRecibido } from '../core/notificaciones/mensajeria';
import { useReserva } from './useReserva';

/**
 * Escucha los avisos del bus (HU-58).
 *
 * Dos fuentes, porque el navegador las separa: `onMessage` cuando la pestana
 * esta visible, y el `postMessage` del Service Worker cuando llego con la
 * pestana cerrada o el pasajero toco la notificacion.
 *
 * Si el pasajero respondio desde los botones de la propia notificacion, el aviso
 * ya trae la respuesta y se envia sin preguntar de nuevo.
 */
export function useAvisosDelBus(): { preguntandoAbordaje: boolean } {
  const { reserva, responderAbordaje } = useReserva();
  const [preguntandoAbordaje, setPreguntandoAbordaje] = useState(false);

  useEffect(() => {
    let vivo = true;

    function procesar(aviso: AvisoRecibido) {
      if (!vivo || aviso.tipo !== 'confirmar-abordaje') return;

      if (aviso.respuestaAbordaje !== null) {
        void responderAbordaje(aviso.respuestaAbordaje);
        return;
      }

      setPreguntandoAbordaje(true);
    }

    const dejarDeEscucharSw = escucharAvisosDelServiceWorker(procesar);

    let dejarDeEscucharPrimerPlano: (() => void) | null = null;
    void escucharAvisosEnPrimerPlano(procesar).then((baja) => {
      if (vivo) {
        dejarDeEscucharPrimerPlano = baja;
      } else {
        baja();
      }
    });

    return () => {
      vivo = false;
      dejarDeEscucharSw();
      dejarDeEscucharPrimerPlano?.();
    };
  }, [responderAbordaje]);

  // Respondida la reserva, la pregunta se retira.
  useEffect(() => {
    if (reserva && (reserva.estado === 'ABORDO' || reserva.estado === 'CANCELADA')) {
      setPreguntandoAbordaje(false);
    }
  }, [reserva]);

  return { preguntandoAbordaje };
}
