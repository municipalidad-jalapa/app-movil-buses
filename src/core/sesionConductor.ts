import { obtenerTokenActual } from './apiClient';

/**
 * Si el dispositivo tiene guardado un JWT de conductor.
 *
 * Es una comprobacion de presencia, no de validez plena: un token vencido o
 * revocado sigue estando "presente" hasta que el backend lo rechaza con
 * 401/403. El panel del conductor (HU-62) combina esto con esa respuesta
 * para decidir si la sesion sigue siendo valida.
 *
 * PUNTO DE INTEGRACION HU-129: cuando exista la sesion real del conductor,
 * esta funcion debe consultarla en vez de depender solo del JWT guardado.
 */
export function haySesionConductor(): boolean {
  return obtenerTokenActual() !== null;
}
