/*
 * Service Worker de avisos de EcoRuta (HU-58).
 *
 * Atiende los avisos cuando la pestana esta cerrada. Es un archivo estatico
 * servido desde la raiz del origen: NO pasa por Vite, no admite import ni
 * `import.meta.env`, y por eso la configuracion de Firebase le llega en la query
 * string con la que `mensajeria.ts` lo registra.
 *
 * Si editas este archivo, acordate de que el navegador cachea los service
 * workers: en desarrollo hay que darle a "Update on reload" en DevTools.
 */

/* global importScripts, firebase, clients */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const parametros = new URLSearchParams(self.location.search);

const configuracion = {
  apiKey: parametros.get('apiKey'),
  authDomain: parametros.get('authDomain'),
  projectId: parametros.get('projectId'),
  storageBucket: parametros.get('storageBucket'),
  messagingSenderId: parametros.get('messagingSenderId'),
  appId: parametros.get('appId'),
};

const hayConfiguracion = Boolean(configuracion.apiKey && configuracion.messagingSenderId);

/** Nombre visible del remitente. DESIGN.md §10: lenguaje llano, sin tecnicismos. */
const TITULO_POR_DEFECTO = 'EcoRuta Jalapa';

/**
 * Reenvia el aviso a las pestanas abiertas para que React actualice la pantalla.
 * El estado se resuelve en la aplicacion, nunca en el worker.
 */
async function avisarALaAplicacion(datos) {
  const pestanas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  pestanas.forEach((pestana) => pestana.postMessage(datos));
}

/** Nombres viejos del backend (antes de QA 4.2) -> los de la web. */
const TIPOS_VIEJOS = { APROXIMACION: 'bus-cerca', LLEGADA: 'confirmar-abordaje', POR_VENCER: 'reserva-por-vencer' };

/** Titulos por si el aviso llega sin texto. DESIGN.md §10: lenguaje llano. */
const TITULOS = {
  'bus-cerca': 'El bus está por llegar',
  'confirmar-abordaje': '¿Lograste subir al bus?',
  'reserva-por-vencer': 'Tu aviso está por vencer',
};

function construirNotificacion(crudos) {
  const datos = { ...crudos, tipo: TIPOS_VIEJOS[crudos.tipo] || crudos.tipo };
  const esAbordaje = datos.tipo === 'confirmar-abordaje';
  const esVencimiento = datos.tipo === 'reserva-por-vencer';

  return {
    titulo: datos.titulo || TITULOS[datos.tipo] || TITULO_POR_DEFECTO,
    opciones: {
      body: datos.cuerpo || '',
      // TODO(HU-PWA): agregar icon y badge cuando exista el manifest con los
      // iconos de la aplicacion. Apuntar a un archivo inexistente deja la
      // notificacion sin icono y sin aviso de error.
      tag: esAbordaje
        ? `abordaje-${datos.reservaId ?? 'sin-reserva'}`
        : esVencimiento
          ? `vence-${datos.reservaId ?? 'sin-reserva'}`
          : 'bus-cerca',
      // Renotificar y no cerrarse sola en las dos preguntas: si se pierden, la
      // reserva queda colgada o vence sin que el pasajero se entere.
      renotify: esAbordaje || esVencimiento,
      requireInteraction: esAbordaje || esVencimiento,
      vibrate: [220, 120, 220],
      data: datos,
      actions: esAbordaje
        ? [
            { action: 'subi', title: 'Sí subí' },
            { action: 'no-subi', title: 'No subí' },
          ]
        : [],
    },
  };
}

if (hayConfiguracion) {
  firebase.initializeApp(configuracion);

  firebase.messaging().onBackgroundMessage((mensaje) => {
    const datos = mensaje.data || {};
    const { titulo, opciones } = construirNotificacion(datos);
    return self.registration.showNotification(titulo, opciones);
  });
}

/**
 * Abre la aplicacion en el mapa, o enfoca la pestana que ya este abierta.
 *
 * Criterio de la historia: tocar cualquiera de los dos avisos abre la aplicacion
 * en la pantalla del mapa.
 */
async function abrirLaAplicacion(datos) {
  const pestanas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  const abierta = pestanas.find((pestana) => 'focus' in pestana);

  if (abierta) {
    await abierta.focus();
    abierta.postMessage(datos);
    return;
  }

  await clients.openWindow('/');
}

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();

  const datos = { ...(evento.notification.data || {}) };

  // Los dos botones responden el abordaje sin que el pasajero abra la aplicacion.
  if (evento.action === 'subi' || evento.action === 'no-subi') {
    datos.respuestaAbordaje = evento.action === 'subi' ? 'true' : 'false';
  }

  evento.waitUntil(
    (async () => {
      await avisarALaAplicacion(datos);
      await abrirLaAplicacion(datos);
    })(),
  );
});

// Sin esto el worker nuevo se queda "waiting" hasta que se cierren todas las
// pestanas, y el pasajero sigue con la version vieja.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(clients.claim()));
