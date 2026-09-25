import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RAIZ } from '../utilidades';

/**
 * HU-87 - Build de producción REAL.
 *
 * Corre `tsc --noEmit` y `vite build` igual que `npm run build`, pero con las
 * variables de producción de mentira y con la salida en una carpeta temporal:
 * no toca tu dist/ ni tu .env. Tarda unos 20-40 segundos.
 */

const URL_PRODUCCION = 'https://api.produccion.ejemplo.test';
const salida = mkdtempSync(path.join(os.tmpdir(), 'ecoruta-hu87-'));
const entorno = {
  ...process.env,
  VITE_API_BASE_URL: URL_PRODUCCION,
  VITE_FIREBASE_API_KEY: 'clave-publica-de-prueba',
  VITE_FIREBASE_AUTH_DOMAIN: 'ecoruta-prod.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'ecoruta-prod',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
  VITE_AUTH_CONDUCTOR_SIMULADO: undefined,
  NODE_ENV: 'production',
};

function ejecutar(binario: string[]) {
  return spawnSync(process.execPath, binario, { cwd: RAIZ, env: entorno as NodeJS.ProcessEnv, encoding: 'utf8' });
}

function archivosDe(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const completo = path.join(dir, nombre);
    return statSync(completo).isDirectory() ? archivosDe(completo) : [completo];
  });
}

let tipos: ReturnType<typeof ejecutar>;
let build: ReturnType<typeof ejecutar>;
let archivos: string[] = [];
let scripts: string[] = [];

beforeAll(() => {
  tipos = ejecutar([path.join(RAIZ, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit']);
  build = ejecutar([path.join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', salida, '--emptyOutDir']);
  if (existsSync(salida)) {
    archivos = archivosDe(salida).map((a) => path.relative(salida, a).replaceAll('\\', '/'));
    scripts = archivos.filter((a) => a.endsWith('.js'));
  }
}, 300_000);

afterAll(() => {
  rmSync(salida, { recursive: true, force: true });
});

const contenido = (relativo: string) => readFileSync(path.join(salida, relativo), 'utf8');

describe('HU-87 - npm run build', () => {
  it('la verificación de tipos (tsc --noEmit) termina sin errores', () => {
    expect(tipos.stdout + tipos.stderr).toBe('');
    expect(tipos.status).toBe(0);
  });

  it('vite build termina con código 0', () => {
    expect(build.status, build.stdout + build.stderr).toBe(0);
  });

  it('genera index.html con el título definitivo', () => {
    expect(contenido('index.html')).toContain('<title>EcoRuta — Bus eléctrico de Jalapa</title>');
  });
});

describe('HU-87 - El build trae ícono, manifest y pantalla de carga', () => {
  it.each([
    'favicon.svg',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'manifest.webmanifest',
    'firebase-messaging-sw.js',
  ])('dist/%s existe', (archivo) => {
    expect(archivos).toContain(archivo);
  });

  it('index.html conserva la pantalla de carga dentro de #raiz', () => {
    const html = contenido('index.html');
    expect(html).toMatch(/<div id="raiz">\s*<div class="pantalla-de-carga" role="status"/);
    expect(html).toContain('Cargando…');
  });

  it('index.html enlaza el ícono, el ícono de iOS y el manifest', () => {
    const html = contenido('index.html');
    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('href="/manifest.webmanifest"');
  });

  it('el JavaScript de la app se inyecta como módulo con nombre con hash', () => {
    expect(contenido('index.html')).toMatch(/<script type="module"[^>]*src="\/assets\/index-[\w-]+\.js"/);
  });
});

describe('HU-87 - El build está optimizado', () => {
  it('los archivos de assets llevan hash en el nombre (caché segura entre versiones)', () => {
    const hasheados = archivos.filter((a) => a.startsWith('assets/') && /-[\w-]{8}\.(js|css|woff2)$/.test(a));
    expect(hasheados.length).toBeGreaterThanOrEqual(3);
  });

  it('no se publican mapas de código fuente', () => {
    expect(archivos.filter((a) => a.endsWith('.map'))).toEqual([]);
  });

  it('el JavaScript está minificado (líneas larguísimas: sin formato legible)', () => {
    const principal = scripts.find((a) => /assets\/index-[\w-]+\.js$/.test(a) && statSync(path.join(salida, a)).size > 200_000);
    expect(principal).toBeDefined();
    const texto = contenido(principal as string);
    expect(texto.length / texto.split('\n').length).toBeGreaterThan(500);
  });

  it('presupuesto de peso: todo el JavaScript pesa menos de 500 kB comprimido (gzip)', () => {
    const total = scripts.reduce((suma, a) => suma + gzipSync(readFileSync(path.join(salida, a))).length, 0);
    expect(total).toBeLessThan(500 * 1024);
  });

  it('el CSS está incluido en un único archivo', () => {
    expect(archivos.filter((a) => a.endsWith('.css'))).toHaveLength(1);
  });

  it('las fuentes salen de nuestro dominio: no hay referencias a Google Fonts', () => {
    const todo = [contenido('index.html'), ...archivos.filter((a) => a.endsWith('.css')).map(contenido)].join('\n');
    expect(todo).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it('el worker de MapLibre y su fragmento compartido van junto al bundle', () => {
    expect(archivos).toContain('assets/maplibre-gl-worker.mjs');
    expect(archivos).toContain('assets/maplibre-gl-shared.mjs');
  });
});

describe('HU-87 - El build apunta al backend de producción', () => {
  const principal = () => scripts.filter((a) => a.startsWith('assets/')).map(contenido).join('\n');

  it('la URL del backend de producción quedó horneada en el bundle', () => {
    expect(principal()).toContain(URL_PRODUCCION);
  });

  it('no quedó ninguna dirección local del backend en el bundle', () => {
    const codigo = principal();
    expect(codigo).not.toContain('localhost:8080');
    expect(codigo).not.toContain('127.0.0.1:8080');
  });

  it('el simulador del conductor no quedó encendido', () => {
    expect(principal()).not.toMatch(/VITE_AUTH_CONDUCTOR_SIMULADO["']?\s*:\s*["']true["']/);
  });

  it('no se coló ningún archivo .env ni el .env.example en la salida', () => {
    expect(archivos.filter((a) => /(^|\/)\.env/.test(a))).toEqual([]);
  });
});
