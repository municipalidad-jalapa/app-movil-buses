/**
 * Avisos que da la propia app, sin pasar por el servidor (QA 4.1).
 *
 * <p>Sirven mientras la pestana esta abierta aunque no se este mirando: el
 * pasajero guarda el telefono en la parada y la reserva esta por vencer. Con la
 * pestana cerrada el aviso lo manda el backend por push (fase 3); esto cubre el
 * caso en que la pagina sigue viva, sin depender de que Firebase este
 * configurado.
 */

export interface AvisoLocal {
  titulo: string;
  cuerpo: string;
  /** Mismo tag = reemplaza al anterior en vez de apilarse. */
  etiqueta: string;
}

/** Vibra si el telefono lo permite. En escritorio no hace nada. */
export function vibrar(patron: number[] = [220, 120, 220]): void {
  try {
    navigator.vibrate?.(patron);
  } catch {
    // Algunos navegadores lo bloquean sin gesto del usuario: no es un error.
  }
}

/**
 * Muestra una notificacion del sistema si hay permiso y la pagina no esta a la
 * vista. Con la pagina visible no hace falta: el aviso ya esta en pantalla.
 *
 * <p>Se prefiere el Service Worker (`showNotification`): en Android Chrome el
 * constructor `new Notification()` no esta permitido.
 */
export async function notificarSiNoSeVe(aviso: AvisoLocal): Promise<boolean> {
  if (typeof document === 'undefined' || document.visibilityState === 'visible') return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;

  const opciones: NotificationOptions = {
    body: aviso.cuerpo,
    tag: aviso.etiqueta,
  };

  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    if (registro) {
      await registro.showNotification(aviso.titulo, opciones);
      return true;
    }
    new Notification(aviso.titulo, opciones);
    return true;
  } catch {
    return false;
  }
}
