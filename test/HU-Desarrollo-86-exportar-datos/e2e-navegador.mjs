/**
 * Prueba de punta a punta en un navegador REAL (Chromium) de la pantalla
 * "Exportar datos" (HU-86), contra un backend SIMULADO.
 *
 *   node test/HU-Desarrollo-86-exportar-datos/e2e-navegador.mjs
 *
 * Levanta: (1) un backend falso en :8787 que imita el endpoint de exportacion
 * (Bearer, 400/401/403/422, .xlsx, Content-Disposition, CORS) y (2) `vite dev` en
 * :5199 apuntando a ese backend. Inyecta una sesion de administrador en
 * localStorage (el login con Firebase no se prueba aqui: eso es SCRUM-173).
 *
 * Requiere Playwright con Chromium instalado. Si no esta en el proyecto, se toma
 * de la variable PLAYWRIGHT_DIR o de la cache de npx. Sale con codigo 1 si algo falla.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..', '..');
const evidencia = path.join(aqui, 'evidencia');
mkdirSync(evidencia, { recursive: true });

const PUERTO_API = 8787;
const PUERTO_WEB = 5199;
const WEB = `http://127.0.0.1:${PUERTO_WEB}`;
const XLSX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('xlsx-simulado-e2e')]);

function cargarPlaywright() {
  const candidatos = [
    process.env.PLAYWRIGHT_DIR,
    path.join(raiz, 'node_modules', 'playwright'),
    ...(() => {
      const base = path.join(homedir(), 'AppData', 'Local', 'npm-cache', '_npx');
      return existsSync(base) ? readdirSync(base).map((d) => path.join(base, d, 'node_modules', 'playwright')) : [];
    })(),
  ].filter(Boolean);
  const req = createRequire(import.meta.url);
  for (const c of candidatos) {
    if (existsSync(c)) return req(c);
  }
  throw new Error('No encuentro Playwright. Instala con: npm i -D playwright && npx playwright install chromium');
}

/* ---------------- backend simulado ---------------- */
const vistas = [];
const cors = {
  'Access-Control-Allow-Origin': WEB,
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Disposition',
  Vary: 'Origin',
};
function levantarApi() {
  const s = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET' });
      return res.end();
    }
    vistas.push({ ruta: url.pathname, params: Object.fromEntries(url.searchParams), auth: req.headers.authorization });
    const json = (status, message) => {
      res.writeHead(status, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ timestamp: 't', status, error: 'e', message, path: url.pathname }));
    };
    if (url.pathname === '/api/v1/admin/servicio') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ consultadoEn: new Date().toISOString(), rutas: [] }));
    }
    if (url.pathname !== '/api/v1/admin/exportaciones/servicio') return json(404, 'No existe');
    if (req.headers.authorization === 'Bearer vencido') return json(401, 'Sesion invalida');
    const { desde, hasta } = Object.fromEntries(url.searchParams);
    if (desde === '2020-01-01') return json(422, 'El servidor rechazo este rango de prueba');
    res.writeHead(200, {
      ...cors,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="servicio_${desde}_${hasta}.xlsx"`,
      'Cache-Control': 'no-store',
    });
    res.end(XLSX);
  });
  return new Promise((ok) => s.listen(PUERTO_API, '127.0.0.1', () => ok(s)));
}

/* ---------------- servidor web (vite dev) ---------------- */
function levantarWeb() {
  const hijo = spawn(process.execPath, [path.join(raiz, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PUERTO_WEB), '--host', '127.0.0.1', '--strictPort'], {
    cwd: raiz,
    env: {
      ...process.env,
      VITE_API_BASE_URL: `http://127.0.0.1:${PUERTO_API}`,
      VITE_FIREBASE_API_KEY: 'k',
      VITE_FIREBASE_AUTH_DOMAIN: 'x.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'x',
      VITE_FIREBASE_APP_ID: '1:1:web:x',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error('vite no arranco a tiempo')), 60_000);
    hijo.stdout.on('data', (d) => {
      if (String(d).includes(`${PUERTO_WEB}`)) {
        clearTimeout(t);
        ok(hijo);
      }
    });
    hijo.on('exit', (c) => no(new Error(`vite salio con ${c}`)));
  });
}

/* ---------------- arnes ---------------- */
const resultados = [];
async function paso(nombre, fn) {
  try {
    await fn();
    resultados.push({ nombre, ok: true });
    console.log(`[PASO]  ${nombre}`);
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e.message });
    console.log(`[FALLO] ${nombre}\n        ${e.message.split('\n')[0]}`);
  }
}
function igual(real, esperado, que) {
  if (real !== esperado) throw new Error(`${que}: esperaba ${JSON.stringify(esperado)} y llego ${JSON.stringify(real)}`);
}

async function main() {
  const { chromium } = cargarPlaywright();
  let api = await levantarApi();
  const web = await levantarWeb();
  const navegador = await chromium.launch();
  const sesion = (token) =>
    JSON.stringify({ token, expiraEnMs: Date.now() + 30 * 60_000, inactividadMinutos: 30, correo: 'admin@jalapa.gob.gt' });

  async function nuevaPagina(token = 'jwt-admin') {
    const ctx = await navegador.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    await ctx.addInitScript((s) => localStorage.setItem('ecoruta_jwt_admin', s), sesion(token));
    return ctx.newPage();
  }
  const fechas = async (p, d, h) => {
    await p.fill('input[aria-label="Desde"], label:has-text("Desde") input', d);
    await p.fill('label:has-text("Hasta") input', h);
  };

  await paso('E1 · navegar desde la portada a "Exportar datos" con el enlace de la cabecera', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin`);
    await p.getByRole('link', { name: 'Exportar datos' }).click();
    await p.waitForURL('**/admin/exportar');
    igual(await p.getByRole('heading', { name: 'Exportar datos del servicio' }).count(), 1, 'titulo');
    await p.screenshot({ path: path.join(evidencia, '01-pantalla-exportar.png') });
    await p.context().close();
  });

  await paso('E2 · criterio 1 y 2: descarga real del .xlsx de un rango (bytes y nombre intactos)', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    vistas.length = 0;
    await fechas(p, '2026-09-01', '2026-09-15');
    const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click()]);
    igual(descarga.suggestedFilename(), 'servicio_2026-09-01_2026-09-15.xlsx', 'nombre');
    const ruta = path.join(tmpdir(), descarga.suggestedFilename());
    await descarga.saveAs(ruta);
    const bytes = readFileSync(ruta);
    igual(bytes.equals(XLSX), true, 'bytes del archivo');
    igual(bytes.subarray(0, 2).toString(), 'PK', 'firma ZIP/xlsx');
    await p.getByRole('status').waitFor();
    igual(vistas.length, 1, 'peticiones al backend');
    igual(vistas[0].auth, 'Bearer jwt-admin', 'Authorization');
    igual(JSON.stringify(vistas[0].params), JSON.stringify({ desde: '2026-09-01', hasta: '2026-09-15' }), 'parametros (solo rango)');
    await p.screenshot({ path: path.join(evidencia, '02-descarga-lista.png') });
    await p.context().close();
  });

  await paso('E3 · criterio 2: el rango invertido no se envia y se avisa', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    vistas.length = 0;
    await fechas(p, '2026-09-15', '2026-09-01');
    await p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click();
    igual(await p.getByRole('alert').innerText(), 'La fecha final no puede ser anterior a la fecha de inicio.', 'aviso');
    igual(vistas.length, 0, 'peticiones');
    await p.context().close();
  });

  await paso('E4 · criterio 2: un rango de 367 dias no se envia', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    vistas.length = 0;
    await fechas(p, '2025-01-01', '2026-01-02');
    await p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click();
    igual(await p.getByRole('alert').innerText(), 'El rango puede abarcar como máximo 366 días.', 'aviso');
    igual(vistas.length, 0, 'peticiones');
    await p.context().close();
  });

  await paso('E5 · el limite exacto de 366 dias SI se envia', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    await fechas(p, '2025-01-01', '2026-01-01');
    const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click()]);
    igual(d.suggestedFilename(), 'servicio_2025-01-01_2026-01-01.xlsx', 'nombre');
    await p.context().close();
  });

  await paso('E6 · el backend responde 422: se muestra su mensaje y no se descarga nada', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    await fechas(p, '2020-01-01', '2020-01-10');
    let descargo = false;
    p.on('download', () => (descargo = true));
    await p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click();
    igual(await p.getByRole('alert').innerText(), 'El servidor rechazo este rango de prueba', 'mensaje 422');
    igual(descargo, false, 'descarga');
    await p.screenshot({ path: path.join(evidencia, '03-error-422.png') });
    await p.context().close();
  });

  await paso('E7 · sesion vencida (401): vuelve al login y borra la sesion', async () => {
    const p = await nuevaPagina('vencido');
    await p.goto(`${WEB}/admin/exportar`);
    await fechas(p, '2026-09-01', '2026-09-15');
    await p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click();
    await p.waitForURL('**/admin/login');
    igual(await p.evaluate(() => localStorage.getItem('ecoruta_jwt_admin')), null, 'sesion guardada');
    await p.context().close();
  });

  await paso('E8 · sin sesion, /admin/exportar manda al login', async () => {
    const ctx = await navegador.newContext();
    const p = await ctx.newPage();
    await p.goto(`${WEB}/admin/exportar`);
    await p.waitForURL('**/admin/login');
    await ctx.close();
  });

  await paso('E9 · criterio 3: la pantalla avisa que no hay datos de pasajeros y no pide datos personales', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    igual(await p.getByText('no incluye información que identifique a ningún pasajero').count(), 1, 'aviso de privacidad');
    igual(await p.locator('input').count(), 2, 'campos de la pantalla');
    await p.context().close();
  });

  await paso('E10 · "Hasta" arranca en hoy (Guatemala) y no deja elegir el futuro', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date());
    igual(await p.locator('label:has-text("Hasta") input').inputValue(), hoy, 'valor');
    igual(await p.locator('label:has-text("Hasta") input').getAttribute('max'), hoy, 'max');
    await p.context().close();
  });

  await paso('E11 · pantalla sin scroll horizontal en escritorio', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    igual(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'scroll horizontal');
    await p.context().close();
  });

  await paso('E12 · servicio caido: mensaje de conexion, sin jerga, y se puede reintentar', async () => {
    const p = await nuevaPagina();
    await p.goto(`${WEB}/admin/exportar`);
    await fechas(p, '2026-09-01', '2026-09-15');
    await new Promise((ok) => api.close(ok));
    api.closeAllConnections?.();
    await p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click();
    const texto = await p.getByRole('alert').innerText();
    igual(texto.includes('revisa tu conexion'), true, `mensaje (${texto})`);
    igual(/Failed to fetch|TypeError|ApiError|50\d/.test(texto), false, 'jerga tecnica');
    api = await levantarApi();
    const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Descargar hoja de cálculo' }).click()]);
    igual(d.suggestedFilename(), 'servicio_2026-09-01_2026-09-15.xlsx', 'reintento');
    await p.context().close();
  });

  await navegador.close();
  web.kill();
  await new Promise((ok) => api.close(ok));

  const fallos = resultados.filter((r) => !r.ok).length;
  console.log(`\nRESUMEN E2E: ${resultados.length - fallos} / ${resultados.length} pasaron, ${fallos} fallos`);
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error('E2E abortado:', e);
  process.exit(2);
});
