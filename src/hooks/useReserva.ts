import { useContext } from 'react';

import { contextoReserva } from '../estado/ReservaProvider';
import type { ContextoReserva } from '../estado/ReservaProvider';

/**
 * Acceso a la reserva del pasajero (HU-58).
 *
 * Lanza si se usa fuera del provider: es un error de programacion, no un estado
 * posible, y conviene que salte en desarrollo y no en la calle.
 */
export function useReserva(): ContextoReserva {
  const contexto = useContext(contextoReserva);

  if (!contexto) {
    throw new Error('useReserva debe usarse dentro de <ReservaProvider>.');
  }

  return contexto;
}
