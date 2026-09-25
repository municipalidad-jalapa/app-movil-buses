import { useContext } from 'react';

import { contextoRutaElegida } from '../estado/RutaElegidaProvider';
import type { ContextoRutaElegida } from '../estado/RutaElegidaProvider';

/**
 * La ruta que el pasajero esta mirando y como cambiarla.
 *
 * Lanza fuera del provider: es un error de programacion, no un estado posible.
 */
export function useRutaElegida(): ContextoRutaElegida {
  const contexto = useContext(contextoRutaElegida);

  if (!contexto) {
    throw new Error('useRutaElegida debe usarse dentro de <RutaElegidaProvider>.');
  }

  return contexto;
}
