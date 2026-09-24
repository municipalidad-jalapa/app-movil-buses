#!/usr/bin/env node
/**
 * HU-87 - Verificación de una imagen/despliegue de EcoRuta YA en marcha.
 *
 * Sirve igual para un contenedor local, para QA o para producción:
 *
 *   node test/SCRUM-11-HU-87/herramientas/verificar-imagen.mjs http://localhost:8087
 *   node test/SCRUM-11-HU-87/herramientas/verificar-imagen.mjs https://qa.mibusjalapa.lat --api https://qa.mibusjalapa.lat
 *
 * Opciones:
 *   --api <url>   URL del backend que DEBE estar horneada en el bundle. Sin esta
 *                 opción solo se comprueba que no haya direcciones locales.
 *   --permitir-local   No falla si el bundle apunta a localhost (solo pruebas locales).
 *
 * Solo lee (GET). No necesita dependencias: Node 18 o superior.
 * Sale con código 1 si algo falla, para poder usarlo en un pipeline.
 */

const argumentos = process.argv.slice(2);
const base = (argumentos.find((a) => /^https?:\/\//.test(a)) ?? '').replace(/\/+$/, '');
const indiceApi = argumentos.indexOf('--api');
const apiEsperada = indiceApi >= 0 ? argumentos[indiceApi + 1]?.replace(/\/+$/, '') : undefined;
const permitirLocal = argumentos.includes('--permitir-local');

if (!base) {
  console.error('Uso: node verificar-imagen.mjs <url-base> [--api <url-del-backend>] [--permitir-local]');
  process.exit(2);
}

let pasaron = 0;
let fallaron = 0;

async function prueba(nombre, funcion) {
  try {
    await funcion();
    pasaron += 1;
    console.log(`[PASO ] ${nombre}`);
  } catch (error) {
    fallaron += 1;
    console.log(`[FALLO] ${nombre}\n        -> ${error.message}`);
  }
}

function afirmar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

async function pedir(ruta) {
  const respuesta = await fetch(base + ruta, { redirect: 'manual' });
  return { respuesta, tipo: respuesta.headers.get('content-type') ?? '', texto: await respuesta.text() };
}

console.log(`Verificando ${base}${apiEsperada ? `  (backend esperado: ${apiEsperada})` : ''}\n`);

const inicio = await pedir('/');
let rutaBundle = null;

await prueba('GET /health responde 200 "healthy"', async () => {
  const { respuesta, texto } = await pedir('/health');
  afirmar(respuesta.status === 200, `status ${respuesta.status}`);
  afirmar(texto.trim() === 'healthy', `cuerpo: ${JSON.stringify(texto.slice(0, 40))}`);
});

await prueba('GET / devuelve HTML 200', async () => {
  afirmar(inicio.respuesta.status === 200, `status ${inicio.respuesta.status}`);
  afirmar(inicio.tipo.includes('text/html'), `content-type: ${inicio.tipo}`);
});

await prueba('El título es el definitivo', () => {
  afirmar(inicio.texto.includes('<title>EcoRuta — Bus eléctrico de Jalapa</title>'), 'no se encontró el título de EcoRuta');
});

await prueba('index.html trae ícono, ícono de iOS y manifest', () => {
  for (const enlace of ['href="/favicon.svg"', 'href="/apple-touch-icon.png"', 'href="/manifest.webmanifest"']) {
    afirmar(inicio.texto.includes(enlace), `falta ${enlace}`);
  }
});

await prueba('index.html trae la pantalla de carga dentro de #raiz', () => {
  afirmar(/<div id="raiz">\s*<div class="pantalla-de-carga" role="status"/.test(inicio.texto), 'no está la pantalla de carga');
});

await prueba('Ya no queda el ícono ni el título de una plantilla', () => {
  afirmar(!/vite\.svg|<title>\s*Vite/i.test(inicio.texto), 'aparece la plantilla de Vite');
});

for (const [ruta, tipo] of [
  ['/favicon.svg', 'image/svg+xml'],
  ['/apple-touch-icon.png', 'image/png'],
  ['/icon-192.png', 'image/png'],
  ['/icon-512.png', 'image/png'],
  ['/icon-maskable-512.png', 'image/png'],
]) {
  await prueba(`GET ${ruta} responde 200 como ${tipo}`, async () => {
    const { respuesta, tipo: recibido } = await pedir(ruta);
    afirmar(respuesta.status === 200, `status ${respuesta.status}`);
    afirmar(recibido.includes(tipo), `content-type: ${recibido}`);
  });
}

await prueba('GET /manifest.webmanifest es un JSON válido con nombre e íconos', async () => {
  const { respuesta, tipo, texto } = await pedir('/manifest.webmanifest');
  afirmar(respuesta.status === 200, `status ${respuesta.status}`);
  afirmar(/json|manifest/.test(tipo), `content-type: ${tipo}`);
  const manifiesto = JSON.parse(texto);
  afirmar(manifiesto.short_name === 'EcoRuta', 'short_name distinto de EcoRuta');
  afirmar(Array.isArray(manifiesto.icons) && manifiesto.icons.length >= 3, 'faltan íconos');
});

await prueba('Una ruta del SPA (/ruta/que/no/existe) devuelve index.html, no 404', async () => {
  const { respuesta, texto } = await pedir('/ruta/que/no/existe');
  afirmar(respuesta.status === 200, `status ${respuesta.status}`);
  afirmar(texto.includes('id="raiz"'), 'no devolvió index.html');
});

await prueba('El service worker de avisos se sirve como JavaScript y sin caché', async () => {
  const { respuesta, tipo } = await pedir('/firebase-messaging-sw.js');
  afirmar(respuesta.status === 200, `status ${respuesta.status}`);
  afirmar(tipo.includes('javascript'), `content-type: ${tipo}`);
  afirmar((respuesta.headers.get('cache-control') ?? '').includes('no-cache'), 'sin Cache-Control: no-cache');
});

await prueba('El bundle JavaScript se sirve como JavaScript', async () => {
  rutaBundle = inicio.texto.match(/<script type="module"[^>]*src="(\/assets\/[^"]+\.js)"/)?.[1] ?? null;
  afirmar(rutaBundle, 'index.html no enlaza un bundle en /assets/');
  const { respuesta, tipo } = await pedir(rutaBundle);
  afirmar(respuesta.status === 200, `status ${respuesta.status}`);
  afirmar(tipo.includes('javascript'), `content-type: ${tipo}`);
});

await prueba('El worker de MapLibre (.mjs) se sirve como JavaScript, no como octet-stream', async () => {
  const { respuesta, tipo } = await pedir('/assets/maplibre-gl-worker.mjs');
  afirmar(respuesta.status === 200, `status ${respuesta.status}`);
  afirmar(tipo.includes('javascript'), `content-type: ${tipo}`);
});

await prueba('El bundle apunta al backend esperado (variables de producción)', async () => {
  afirmar(rutaBundle, 'no hay bundle');
  const { texto } = await pedir(rutaBundle);
  if (apiEsperada) {
    afirmar(texto.includes(apiEsperada), `el bundle no contiene ${apiEsperada}`);
  } else {
    console.log('        (sin --api: solo se comprueba que no haya direcciones locales)');
  }
  if (!permitirLocal) {
    afirmar(!texto.includes('localhost:8080'), 'el bundle apunta a localhost:8080');
    afirmar(!texto.includes('127.0.0.1:8080'), 'el bundle apunta a 127.0.0.1:8080');
    if (apiEsperada) {
      afirmar(!/https?:\/\/(localhost|127\.0\.0\.1)/.test(apiEsperada), `--api es una dirección local: ${apiEsperada}`);
    }
  }
});

console.log(`\nResultado: ${pasaron} pasaron, ${fallaron} fallaron.`);
process.exit(fallaron === 0 ? 0 : 1);
