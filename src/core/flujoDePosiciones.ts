import { config } from './config';
import type { Posicion } from './tipos';

/**
 * Suscripcion al flujo de posiciones del bus (SCRUM-243).
 *
 * Vive fuera de React a proposito: asi se puede probar sin montar un componente,
 * igual que `apiClient`. El hook `usePosicionBus` es una capa fina encima.
 */

/** Nombre del evento SSE que emite el backend. NO llega por `onmessage`. */
export const EVENTO_POSICION = 'posicion';

export const RUTA_STREAM = '/api/v1/telemetria/stream';

export type EstadoConexion = 'conectando' | 'en-vivo' | 'reconectando';

export interface ManejadoresDelFlujo {
  onPosicion: (posicion: Posicion) => void;
  onEstado: (estado: EstadoConexion) => void;
}

/** Lo minimo de EventSource que usamos, para poder inyectar un doble en pruebas. */
export interface FuenteDeEventos {
  addEventListener(tipo: string, escucha: (evento: MessageEvent) => void): void;
  close(): void;
  onopen: ((este: unknown) => void) | null;
  onerror: ((este: unknown) => void) | null;
}

export type FabricaDeFuente = (url: string) => FuenteDeEventos;

/**
 * Abre el flujo y devuelve la funcion para cerrarlo.
 *
 * El backend manda la posicion vigente apenas uno se conecta, asi que el primer
 * evento suele llegar de inmediato sin esperar a que el bus reporte.
 *
 * No implementa reintentos propios: `EventSource` reconecta solo, y el backend
 * envia el intervalo en el campo `retry` de cada evento (ADR-008). La espera
 * creciente y el aviso en pantalla son SCRUM-246.
 */
export function suscribirseAPosiciones(
  manejadores: ManejadoresDelFlujo,
  crearFuente: FabricaDeFuente = (url) => new EventSource(url) as unknown as FuenteDeEventos,
): () => void {
  const { apiBaseUrl } = config;
  const fuente = crearFuente(`${apiBaseUrl}${RUTA_STREAM}`);

  manejadores.onEstado('conectando');

  fuente.onopen = () => manejadores.onEstado('en-vivo');

  // EventSource reintenta solo tras un error, asi que esto no es un fallo
  // terminal: es "se corto y esta volviendo".
  fuente.onerror = () => manejadores.onEstado('reconectando');

  fuente.addEventListener(EVENTO_POSICION, (evento) => {
    const posicion = leerPosicion(evento.data);
    if (posicion) {
      // Un evento que llega ya implica que la conexion esta viva, aunque el
      // onopen se haya perdido tras una reconexion.
      manejadores.onEstado('en-vivo');
      manejadores.onPosicion(posicion);
    }
  });

  return () => fuente.close();
}

/**
 * Un evento con JSON malformado no puede tumbar la pantalla del pasajero: se
 * descarta y se sigue esperando el siguiente.
 */
function leerPosicion(datos: unknown): Posicion | null {
  if (typeof datos !== 'string') return null;
  try {
    const posible = JSON.parse(datos) as Partial<Posicion>;
    if (typeof posible.latitud !== 'number' || typeof posible.longitud !== 'number') {
      return null;
    }
    return posible as Posicion;
  } catch {
    return null;
  }
}

/** Cual de las dos posiciones es mas reciente segun el reloj del dispositivo. */
export function esMasReciente(candidata: Posicion, actual: Posicion | null): boolean {
  if (!actual) return true;
  return Date.parse(candidata.timestamp) > Date.parse(actual.timestamp);
}
