#!/usr/bin/env node
/**
 * HU-87 - Comprobaciones en un navegador REAL (Edge o Chrome instalado).
 *
 * Es opcional: usa Playwright, que NO es dependencia del proyecto. Se instala
 * sin tocar package.json:
 *
 *   npm install --no-save playwright-core
 *
 * Y se corre contra las imágenes que ya estén levantadas (ver manual.md, §4):
 *
 *   node test/SCRUM-11-HU-87/herramientas/verificar-navegador.mjs \
 *        --imagen http://localhost:8087 \
 *        --imagen-simulada http://localhost:8088 --backend-simulado http://localhost:8090 \
 *        --salida test/SCRUM-11-HU-87/evidencias --canal msedge
 *
 *   --imagen            imagen construida con variables de prueba (cualquier URL)
 *   --imagen-simulada   imagen construida con VITE_API_BASE_URL apuntando al
 *                       backend simulado; sirve para ver la app montada
 *   --backend-simulado  URL del backend simulado (herramientas/backend-simulado.mjs)
 *   --salida            carpeta donde se guardan las capturas
 *   --canal             msedge (por defecto) o chrome
 *
 * Sin --imagen-simulada se omite la parte de "app montada".
 */
import { mkdirSync } from 'node:fs';

function opcion(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : porDefecto;
}

const imagen = opcion('imagen');
const simulada = opcion('imagen-simulada');
const backendSimulado = opcion('backend-simulado', 'http://localhost:8090');
const salida = opcion('salida', 'test/SCRUM-11-HU-87/evidencias');
const canal = opcion('canal', 'msedge');

if (!imagen) {
  console.error('Falta --imagen <url>. Ver el encabezado de este archivo.');
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  console.error('Falta playwright-core. Instálalo con: npm install --no-save playwright-core');
  process.exit(2);
}

mkdirSync(salida, { recursive: true });
const navegador = await chromium.launch({ channel: canal, headless: true });
const lineas = [];
const comprobar = (nombre, condicion, detalle = '') =>
  lineas.push(`${condicion ? '[PASO ]' : '[FALLO]'} ${nombre}${detalle ? ` -> ${detalle}` : ''}`);
const movil = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };

if (simulada) {
  const contexto = await navegador.newContext(movil);
  const pagina = await contexto.newPage();
  const errores = [];
  const peticiones = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  pagina.on('request', (r) => peticiones.push(r.url()));

  await pagina.goto(simulada, { waitUntil: 'commit' });
  const vistaAntes = await pagina.locator('.pantalla-de-carga').first().isVisible().catch(() => false);
  await pagina.waitForFunction(() => !document.querySelector('.pantalla-de-carga'), null, { timeout: 20000 }).catch(() => {});
  await pagina.waitForTimeout(3500);

  comprobar('La pantalla de carga estaba visible antes de montar la app', vistaAntes);
  comprobar('React reemplazó la pantalla de carga al montar', (await pagina.locator('.pantalla-de-carga').count()) === 0);
  comprobar('El título de la pestaña es el definitivo', (await pagina.title()) === 'EcoRuta — Bus eléctrico de Jalapa');
  comprobar('El ícono declarado es /favicon.svg', (await pagina.locator('link[rel="icon"]').getAttribute('href')) === '/favicon.svg');
  comprobar('El color de tema es el verde Jumay', (await pagina.locator('meta[name="theme-color"]').getAttribute('content')) === '#10402a');
  comprobar(
    'La app pide las rutas al backend configurado',
    peticiones.some((u) => u.startsWith(`${backendSimulado}/api/v1/rutas`)),
  );
  comprobar('La app NO pide nada a localhost:8080', !peticiones.some((u) => u.startsWith('http://localhost:8080')));
  comprobar('No hay errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  await pagina.screenshot({ path: `${salida}/02-app-con-backend-simulado.png` });
  await contexto.close();
}

{
  const contexto = await navegador.newContext(movil);
  const pagina = await contexto.newPage();
  await pagina.route('**/assets/*.js', (r) => r.abort());
  await pagina.goto(imagen, { waitUntil: 'commit' });
  await pagina.waitForTimeout(1500);
  await pagina.screenshot({ path: `${salida}/01-pantalla-de-carga.png` });
  const inicial = await pagina.locator('.pantalla-de-carga__estado').innerText();
  await pagina
    .waitForFunction(() => document.querySelector('.pantalla-de-carga__estado')?.textContent?.startsWith('Está tardando'), null, { timeout: 25000 })
    .catch(() => {});
  const despues = await pagina.locator('.pantalla-de-carga__estado').innerText();
  await pagina.screenshot({ path: `${salida}/03-pantalla-de-carga-tras-20s.png` });
  comprobar('Con el bundle bloqueado, la pantalla dice "Cargando…"', inicial === 'Cargando…', inicial);
  comprobar(
    'A los 20 s cambia al mensaje de demora',
    despues === 'Está tardando más de lo normal: revisa tu conexión y vuelve a abrir la página.',
    despues,
  );
  await contexto.close();
}

{
  const contexto = await navegador.newContext({ ...movil, javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  await pagina.goto(imagen);
  const texto = await pagina.locator('body').innerText();
  await pagina.screenshot({ path: `${salida}/04-sin-javascript.png` });
  comprobar('Sin JavaScript se muestra el aviso claro', /necesita JavaScript/.test(texto));
  comprobar('Sin JavaScript no queda un "Cargando…" engañoso', !texto.includes('Cargando…'));
  await contexto.close();
}

await navegador.close();
console.log(lineas.join('\n'));
process.exit(lineas.some((l) => l.startsWith('[FALLO]')) ? 1 : 0);
