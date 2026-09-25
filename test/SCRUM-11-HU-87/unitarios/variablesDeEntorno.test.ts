import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { leerConfiguracion } from '../../../src/core/config';
import { leer, RAIZ, ruta } from '../utilidades';

/**
 * HU-87 - Variables de entorno de producción.
 * La app no debe arrancar apuntando a una dirección local ni a medias.
 */

/** Lo que el pipeline le pasa a `docker build` en produccion (valores de mentira). */
const entornoProduccion = {
  VITE_API_BASE_URL: 'https://api.produccion.ejemplo.test',
  VITE_FIREBASE_API_KEY: 'clave-publica-de-prueba',
  VITE_FIREBASE_AUTH_DOMAIN: 'ecoruta-prod.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'ecoruta-prod',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
};

const dockerfile = leer('dockerfile');

/** Variables obligatorias, leidas del esquema real de config.ts. */
const obligatorias = [
  ...(leer('src', 'core', 'config.ts').match(/const esquemaEntorno = z\.object\(\{([\s\S]*?)\n\}\);/)?.[1] ?? '').matchAll(
    /(VITE_[A-Z_]+):/g,
  ),
]
  .map((m) => m[1])
  .filter((nombre) => nombre !== 'VITE_AUTH_CONDUCTOR_SIMULADO');

/** El codigo de un archivo sin sus comentarios (los comentarios pueden nombrar `localhost` sin usarlo). */
function sinComentarios(archivo: string): string {
  return readFileSync(archivo, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Archivos .ts/.tsx de src que no son pruebas. */
function archivosDeCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const completo = path.join(dir, nombre);
    if (statSync(completo).isDirectory()) return archivosDeCodigo(completo);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) && !completo.includes(`${path.sep}pruebas${path.sep}`)
      ? [completo]
      : [];
  });
}

describe('HU-87 - La configuración de producción arranca bien', () => {
  it('acepta la URL https del backend y la deja sin barra final', () => {
    const cfg = leerConfiguracion({ ...entornoProduccion, VITE_API_BASE_URL: 'https://api.produccion.ejemplo.test/' });
    expect(cfg.apiBaseUrl).toBe('https://api.produccion.ejemplo.test');
  });

  it('la configuración queda congelada: nadie la cambia en runtime', () => {
    expect(Object.isFrozen(leerConfiguracion(entornoProduccion))).toBe(true);
  });

  it('el simulador de login del conductor queda apagado si el pipeline no lo define', () => {
    expect(leerConfiguracion(entornoProduccion).authConductorSimulado).toBe(false);
  });

  it.each(['false', 'FALSE', '1', 'si', ''])('el simulador sigue apagado con el valor "%s"', (valor) => {
    const cfg = leerConfiguracion({ ...entornoProduccion, VITE_AUTH_CONDUCTOR_SIMULADO: valor });
    expect(cfg.authConductorSimulado).toBe(false);
  });

  it('los avisos quedan apagados (sin romper la app) si no hay variables de mensajería', () => {
    expect(leerConfiguracion(entornoProduccion).mensajeria).toBeNull();
  });

  it('los avisos se encienden cuando están las dos variables de mensajería', () => {
    const cfg = leerConfiguracion({
      ...entornoProduccion,
      VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
      VITE_FIREBASE_VAPID_KEY: 'clave-vapid-de-prueba',
    });
    expect(cfg.mensajeria?.messagingSenderId).toBe('123456');
  });

  it('con una sola variable de mensajería la app no arranca (mejor fallar que quedar a medias)', () => {
    expect(() => leerConfiguracion({ ...entornoProduccion, VITE_FIREBASE_VAPID_KEY: 'solo-esta' })).toThrow(
      /VITE_FIREBASE_MESSAGING_SENDER_ID/,
    );
  });
});

describe('HU-87 - Un build mal configurado se detecta, no se despliega a ciegas', () => {
  it.each([
    ['sin la variable (docker build sin --build-arg)', undefined],
    ['vacía', ''],
    ['solo espacios', '   '],
    ['sin protocolo', 'api.produccion.ejemplo.test'],
    ['con el texto "undefined"', 'undefined'],
  ])('rechaza VITE_API_BASE_URL %s', (_caso, valor) => {
    expect(() => leerConfiguracion({ ...entornoProduccion, VITE_API_BASE_URL: valor })).toThrow(
      /VITE_API_BASE_URL/,
    );
  });

  it('el mensaje dice qué variable falta', () => {
    expect(() => leerConfiguracion({ ...entornoProduccion, VITE_API_BASE_URL: '' })).toThrow(
      /Falta la variable VITE_API_BASE_URL/,
    );
  });

  it('las variables obligatorias leídas de config.ts son las esperadas', () => {
    expect(obligatorias).toEqual([
      'VITE_API_BASE_URL',
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_APP_ID',
    ]);
  });

  it.each(Object.keys(entornoProduccion))('rechaza el build si falta %s', (variable) => {
    const entorno: Record<string, unknown> = { ...entornoProduccion };
    delete entorno[variable];
    expect(() => leerConfiguracion(entorno)).toThrow(new RegExp(variable));
  });
});

describe('HU-87 - El Dockerfile pasa las variables al build', () => {
  it.each(obligatorias)('declara ARG y ENV para %s', (variable) => {
    expect(dockerfile).toMatch(new RegExp(`^ARG ${variable}$`, 'm'));
    expect(dockerfile).toMatch(new RegExp(`^ENV ${variable}=\\$${variable}$`, 'm'));
  });

  it('los ARG no traen valor por defecto: si falta la variable el build falla, no usa una dirección local', () => {
    const argumentos = dockerfile.match(/^ARG .+$/gm) ?? [];
    expect(argumentos.length).toBeGreaterThanOrEqual(obligatorias.length);
    for (const linea of argumentos) expect(linea).not.toContain('=');
  });

  it('el Dockerfile no fija ninguna dirección local', () => {
    expect(dockerfile).not.toMatch(/localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal/);
  });

  it('el Dockerfile no enciende el simulador del conductor', () => {
    expect(dockerfile).not.toContain('VITE_AUTH_CONDUCTOR_SIMULADO');
  });

  it('las variables se declaran ANTES de npm run build (Vite las hornea al compilar)', () => {
    const build = dockerfile.indexOf('RUN npm run build');
    for (const variable of obligatorias) {
      expect(dockerfile.indexOf(`ARG ${variable}`)).toBeGreaterThan(-1);
      expect(dockerfile.indexOf(`ARG ${variable}`)).toBeLessThan(build);
    }
  });
});

describe('HU-87 - Secretos y direcciones locales fuera del repositorio', () => {
  it('.dockerignore deja fuera los .env: no se hornean en la imagen', () => {
    const ignorados = leer('.dockerignore').split(/\r?\n/);
    expect(ignorados).toContain('.env');
    expect(ignorados).toContain('.env.local');
  });

  it('.gitignore ignora los .env pero versiona .env.example', () => {
    const lineas = leer('.gitignore').split(/\r?\n/);
    expect(lineas).toContain('.env');
    expect(lineas).toContain('.env.*');
    expect(lineas).toContain('!.env.example');
  });

  it('.env.example solo trae placeholders, no llaves reales', () => {
    const ejemplo = leer('.env.example');
    expect(ejemplo).toContain('VITE_FIREBASE_API_KEY=reemplazar-api-key');
    expect(ejemplo).not.toMatch(/AIza[0-9A-Za-z_-]{35}/);
  });

  it('.env.example ya no describe un config.js que la app no lee', () => {
    const ejemplo = leer('.env.example');
    expect(ejemplo).not.toContain('window.__ECORUTA__');
    expect(ejemplo).not.toContain('VITE_API_URL');
  });

  it('ningún archivo de despliegue trae una llave de Firebase real', () => {
    for (const archivo of ['dockerfile', 'nginx.conf', 'index.html', '.github/workflows/desplegar.yml', '.github/workflows/ci.yml']) {
      expect(readFileSync(ruta(archivo), 'utf8')).not.toMatch(/AIza[0-9A-Za-z_-]{35}/);
    }
  });

  it('el código de la app no tiene direcciones locales escritas a mano', () => {
    const conLocal = archivosDeCodigo(path.join(RAIZ, 'src')).filter((archivo) =>
      /localhost|127\.0\.0\.1/.test(sinComentarios(archivo)),
    );
    expect(conLocal.map((a) => path.relative(RAIZ, a))).toEqual([]);
  });

  it('solo config.ts lee import.meta.env (un único punto de acceso a las variables)', () => {
    const lectores = archivosDeCodigo(path.join(RAIZ, 'src'))
      .filter((archivo) => /import\.meta\.env(?!\.DEV)/.test(sinComentarios(archivo)))
      .map((a) => path.relative(RAIZ, a).replaceAll('\\', '/'));
    expect(lectores).toEqual(['src/core/config.ts']);
  });
});

describe('HU-87 - El pipeline arma las variables desde una sola fuente', () => {
  const flujo = leer('.github', 'workflows', 'desplegar.yml');

  it('QA y producción leen la lista de variables obligatorias de la misma variable del repo', () => {
    const usos = flujo.match(/required-build-args: \$\{\{ vars\.VITE_REQUIRED_BUILD_ARGS \}\}/g) ?? [];
    expect(usos).toHaveLength(2);
  });

  it('el pipeline no escribe URLs ni llaves en el YAML', () => {
    expect(flujo).not.toMatch(/https?:\/\/(?!.*pipeline-templates)/);
    expect(flujo).not.toMatch(/localhost/);
  });
});
