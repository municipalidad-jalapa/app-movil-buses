/**
 * Permiso de avisos del navegador (HU-58).
 *
 * Dos reglas de la historia viven aca:
 *
 * 1. El permiso se pide despues de explicar para que sirve, nunca de golpe. Este
 *    modulo solo lo solicita; la explicacion la pone `PreferenciaNotificaciones`.
 * 2. Si el pasajero dice que no, la aplicacion no vuelve a insistir en cada
 *    visita. Por eso el rechazo se recuerda en localStorage: `Notification.permission`
 *    se queda en 'default' cuando el usuario cierra el dialogo sin elegir, y sin
 *    esta bandera le estariamos preguntando otra vez en cada carga.
 */

/** Misma convencion de clave que `identidadDispositivo.ts`. */
const CLAVE_RECHAZO = 'ecoruta_avisos_rechazados';

/**
 * 'no-soportado' cubre un caso real: iOS Safari no expone `Notification` hasta
 * que la aplicacion esta guardada en la pantalla de inicio.
 */
export type EstadoPermiso = 'concedido' | 'denegado' | 'sin-responder' | 'no-soportado';

/** Las notificaciones web exigen contexto seguro. `localhost` cuenta como seguro. */
export function haySoporteDeAvisos(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    window.isSecureContext
  );
}

export function estadoDelPermiso(): EstadoPermiso {
  if (!haySoporteDeAvisos()) {
    return 'no-soportado';
  }

  switch (Notification.permission) {
    case 'granted':
      return 'concedido';
    case 'denied':
      return 'denegado';
    default:
      return 'sin-responder';
  }
}

/** localStorage puede lanzar en modo privado o con las cookies bloqueadas. */
function leerBandera(): boolean {
  try {
    return localStorage.getItem(CLAVE_RECHAZO) === 'true';
  } catch {
    return false;
  }
}

export function yaFueRechazado(): boolean {
  return leerBandera();
}

export function marcarRechazado(): void {
  try {
    localStorage.setItem(CLAVE_RECHAZO, 'true');
  } catch {
    // Sin almacenamiento volveremos a preguntar la proxima visita. Es molesto,
    // pero es preferible a romper la reserva, que es lo que el pasajero vino a hacer.
  }
}

export function olvidarRechazo(): void {
  try {
    localStorage.removeItem(CLAVE_RECHAZO);
  } catch {
    // Sin almacenamiento no hay nada que olvidar.
  }
}

/**
 * Muestra el dialogo del navegador y recuerda la negativa.
 *
 * Solo debe llamarse desde un gesto del usuario: varios navegadores ignoran la
 * solicitud si no viene de un clic.
 */
export async function solicitarPermiso(): Promise<EstadoPermiso> {
  if (!haySoporteDeAvisos()) {
    return 'no-soportado';
  }

  const respuesta = await Notification.requestPermission();

  if (respuesta !== 'granted') {
    marcarRechazado();
    return respuesta === 'denied' ? 'denegado' : 'sin-responder';
  }

  olvidarRechazo();
  return 'concedido';
}

/**
 * Si ya fue rechazado, o el navegador no soporta avisos, no hay nada que ofrecer
 * y la interfaz no debe mostrar la invitacion.
 */
export function sePuedeOfrecerAvisos(): boolean {
  return haySoporteDeAvisos() && !yaFueRechazado() && estadoDelPermiso() === 'sin-responder';
}
