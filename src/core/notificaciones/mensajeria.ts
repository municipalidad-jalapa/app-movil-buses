import { config } from '../config';

/**
 * Firebase Cloud Messaging para web (HU-58).
 *
 * Todo lo de Firebase entra por import dinamico: `vite.config.ts` avisa a partir
 * de 300 kB de chunk y HU-50 exige que el mapa cargue en menos de 3 s con red
 * movil. El SDK solo se descarga cuando el pasajero acepta los avisos.
 */

/** Ruta del Service Worker. Va en `public/`, servido desde la raiz del origen. */
const RUTA_SERVICE_WORKER = '/firebase-messaging-sw.js';

/** Tipos de aviso que manda el backend en `data.tipo`. */
export type TipoAviso = 'bus-cerca' | 'confirmar-abordaje';

/** Lo que la aplicacion entiende de un aviso, venga del SW o del primer plano. */
export interface AvisoRecibido {
  tipo: TipoAviso;
  reservaId: number | null;
  titulo: string;
  cuerpo: string;
  /** Respuesta elegida desde la propia notificacion, si el pasajero uso un boton. */
  respuestaAbordaje: boolean | null;
}

/**
 * El Service Worker es un archivo estatico: no pasa por Vite y no puede leer
 * `import.meta.env`. La configuracion se le entrega en la query string al
 * registrarlo y el worker la lee de `self.location.search`.
 */
function urlDelServiceWorker(): string {
  if (!config.mensajeria) {
    return RUTA_SERVICE_WORKER;
  }

  const parametros = new URLSearchParams({
    apiKey: config.mensajeria.apiKey,
    authDomain: config.mensajeria.authDomain,
    projectId: config.mensajeria.projectId,
    storageBucket: config.mensajeria.storageBucket,
    messagingSenderId: config.mensajeria.messagingSenderId,
    appId: config.mensajeria.appId,
  });

  return `${RUTA_SERVICE_WORKER}?${parametros.toString()}`;
}

let registroPrometido: Promise<ServiceWorkerRegistration> | null = null;

/** Registra el worker una sola vez por carga de pagina. */
export function registrarServiceWorker(): Promise<ServiceWorkerRegistration> {
  registroPrometido ??= navigator.serviceWorker.register(urlDelServiceWorker(), {
    type: 'classic',
  });
  return registroPrometido;
}

/**
 * Devuelve el token de este navegador, o `null` si los avisos estan apagados.
 *
 * `null` no es un error: significa que el entorno no tiene Firebase configurado
 * y que la aplicacion debe seguir funcionando sin avisos.
 */
export async function obtenerTokenNotificacion(): Promise<string | null> {
  if (!config.mensajeria) {
    return null;
  }

  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ]);

  if (!(await isSupported())) {
    return null;
  }

  const aplicacion = getApps()[0] ?? initializeApp(config.mensajeria);
  const registro = await registrarServiceWorker();

  return getToken(getMessaging(aplicacion), {
    vapidKey: config.mensajeria.vapidKey,
    serviceWorkerRegistration: registro,
  });
}

function comoTipoAviso(valor: unknown): TipoAviso | null {
  return valor === 'bus-cerca' || valor === 'confirmar-abordaje' ? valor : null;
}

function comoNumero(valor: unknown): number | null {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

/** Normaliza el `data` crudo del push a la forma que usa la aplicacion. */
export function interpretarAviso(datos: Record<string, unknown> | undefined): AvisoRecibido | null {
  const tipo = comoTipoAviso(datos?.tipo);
  if (!tipo) {
    return null;
  }

  const respuesta = datos?.respuestaAbordaje;

  return {
    tipo,
    reservaId: comoNumero(datos?.reservaId),
    titulo: typeof datos?.titulo === 'string' ? datos.titulo : '',
    cuerpo: typeof datos?.cuerpo === 'string' ? datos.cuerpo : '',
    respuestaAbordaje:
      respuesta === undefined || respuesta === null ? null : String(respuesta) === 'true',
  };
}

/**
 * Avisos que llegan con la pestana visible.
 *
 * Con la pestana en primer plano el Service Worker no dispara `onBackgroundMessage`,
 * asi que sin esto el aviso se perderia justo cuando el pasajero esta mirando.
 */
export async function escucharAvisosEnPrimerPlano(
  alRecibir: (aviso: AvisoRecibido) => void,
): Promise<() => void> {
  if (!config.mensajeria) {
    return () => {};
  }

  const [{ initializeApp, getApps }, { getMessaging, onMessage, isSupported }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ]);

  if (!(await isSupported())) {
    return () => {};
  }

  const aplicacion = getApps()[0] ?? initializeApp(config.mensajeria);

  return onMessage(getMessaging(aplicacion), (mensaje) => {
    const aviso = interpretarAviso(mensaje.data);
    if (aviso) alRecibir(aviso);
  });
}

/**
 * Avisos que reenvia el Service Worker: el pasajero toco la notificacion o uno
 * de sus botones con la pestana cerrada.
 */
export function escucharAvisosDelServiceWorker(
  alRecibir: (aviso: AvisoRecibido) => void,
): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const manejar = (evento: MessageEvent) => {
    const aviso = interpretarAviso(evento.data as Record<string, unknown> | undefined);
    if (aviso) alRecibir(aviso);
  };

  navigator.serviceWorker.addEventListener('message', manejar);
  return () => navigator.serviceWorker.removeEventListener('message', manejar);
}
