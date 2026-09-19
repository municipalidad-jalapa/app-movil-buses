import type { Posicion } from './tipos';

/** DESIGN.md §7: a partir de 5 minutos el dato del bus es `rancio`. */
export const MINUTOS_PARA_RANCIO = 5;

/**
 * El dato ya no dice donde esta el bus ahora (HU-60).
 *
 * Se mide con la hora de captura del dispositivo a bordo (`timestamp`), no con
 * la de llegada al telefono: un dato viejo que acaba de llegar sigue siendo
 * viejo. Si el timestamp no se puede leer, no se declara rancio.
 */
export function esRancio(posicion: Pick<Posicion, 'timestamp'> | null, ahora: number): boolean {
  if (!posicion) return false;
  const capturado = Date.parse(posicion.timestamp);
  return Number.isFinite(capturado) && ahora - capturado > MINUTOS_PARA_RANCIO * 60_000;
}
