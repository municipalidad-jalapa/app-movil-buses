import { describe, expect, it } from 'vitest';
import { leer } from '../utilidades';

/**
 * HU-87 - La imagen Docker de producción, revisada a nivel de archivos.
 * Que la imagen construya y responda de verdad lo comprueban integracion/ y
 * herramientas/verificar-imagen.mjs (ver manual.md).
 */

const dockerfile = leer('dockerfile');
const nginx = leer('nginx.conf');
const paquete = JSON.parse(leer('package.json')) as { scripts: Record<string, string> };
const desplegar = leer('.github', 'workflows', 'desplegar.yml');
const ci = leer('.github', 'workflows', 'ci.yml');

const etapas = [...dockerfile.matchAll(/^FROM (\S+)(?: AS (\S+))?$/gm)].map((m) => ({ imagen: m[1], nombre: m[2] }));

describe('HU-87 - Dockerfile de producción', () => {
  it('es de dos etapas: compila con Node y sirve con Nginx', () => {
    expect(etapas).toHaveLength(2);
    expect(etapas[0]).toEqual({ imagen: 'node:20-alpine', nombre: 'build' });
    expect(etapas[1].imagen).toMatch(/^nginx:/);
  });

  it('la imagen final no arrastra Node ni el código fuente', () => {
    const final = dockerfile.slice(dockerfile.lastIndexOf('FROM nginx'));
    expect(final).not.toMatch(/node|npm|COPY \. /);
  });

  it('usa la misma versión mayor de Node que el CI', () => {
    expect(etapas[0].imagen).toContain('node:20');
    expect(ci).toContain('node-version: "20"');
  });

  it('instala con npm ci (reproducible, respeta package-lock.json)', () => {
    expect(dockerfile).toMatch(/^RUN npm ci$/m);
  });

  it('copia package*.json antes del código para aprovechar la caché de capas', () => {
    expect(dockerfile.indexOf('COPY package*.json')).toBeLessThan(dockerfile.indexOf('RUN npm ci'));
    expect(dockerfile.indexOf('RUN npm ci')).toBeLessThan(dockerfile.indexOf('COPY . .'));
  });

  it('genera el build con npm run build', () => {
    expect(dockerfile).toMatch(/^RUN npm run build$/m);
  });

  it('sirve dist/ desde la raíz de Nginx', () => {
    expect(dockerfile).toContain('COPY --from=build /app/dist /usr/share/nginx/html');
  });

  it('instala la configuración propia de Nginx', () => {
    expect(dockerfile).toContain('COPY nginx.conf /etc/nginx/conf.d/default.conf');
  });

  it('expone el puerto 80 y arranca Nginx en primer plano', () => {
    expect(dockerfile).toMatch(/^EXPOSE 80$/m);
    expect(dockerfile).toContain('CMD ["nginx", "-g", "daemon off;"]');
  });
});

describe('HU-87 - Contexto de build', () => {
  const ignorados = leer('.dockerignore').split(/\r?\n/);

  it.each(['node_modules', 'dist', '.git', '.env', '.env.local'])('.dockerignore excluye %s', (entrada) => {
    expect(ignorados).toContain(entrada);
  });

  it('el package-lock.json existe (lo necesita npm ci)', () => {
    expect(() => leer('package-lock.json')).not.toThrow();
  });
});

describe('HU-87 - Scripts del proyecto', () => {
  it('npm run build revisa los tipos y luego empaqueta con Vite', () => {
    expect(paquete.scripts.build).toBe('tsc --noEmit && vite build');
  });

  it('existe npm run preview para probar el build local', () => {
    expect(paquete.scripts.preview).toBe('vite preview');
  });

  it('vite.config.ts copia el worker de MapLibre al build (si no, ruta y paradas no se dibujan)', () => {
    const configuracion = leer('vite.config.ts');
    expect(configuracion).toContain("'maplibre-gl-worker.mjs'");
    expect(configuracion).toContain("'maplibre-gl-shared.mjs'");
    expect(configuracion).toMatch(/apply: 'build'/);
  });
});

describe('HU-87 - Nginx sirve la aplicación bien', () => {
  it('escucha en el puerto 80', () => {
    expect(nginx).toMatch(/listen 80;/);
  });

  it('devuelve index.html en cualquier ruta del SPA (recargar /mapa no da 404)', () => {
    expect(nginx).toMatch(/location \/ \{[^}]*try_files \$uri \$uri\/ \/index\.html;/s);
  });

  it('expone /health con 200 para las sondas del despliegue', () => {
    expect(nginx).toMatch(/location \/health \{[^}]*return 200 "healthy\\n";/s);
  });

  it('sirve los .mjs (worker de MapLibre) como JavaScript', () => {
    expect(nginx).toMatch(/location ~\* \\\.mjs\$ \{\s*types \{ \}\s*default_type application\/javascript;/);
  });

  it('sirve el manifest como application/manifest+json (nginx no lo conoce y lo daría como octet-stream)', () => {
    expect(nginx).toMatch(/location = \/manifest\.webmanifest \{\s*default_type application\/manifest\+json;/);
  });

  it('el service worker de avisos no se cachea y se sirve desde la raíz', () => {
    expect(nginx).toMatch(/location = \/firebase-messaging-sw\.js \{[^}]*no-cache/s);
    expect(nginx).toContain('Service-Worker-Allowed "/"');
  });
});

describe('HU-87 - Pipeline de imagen', () => {
  it('se dispara con push a develop y a main', () => {
    expect(desplegar).toMatch(/branches: \[develop, main\]/);
  });

  it('develop construye la imagen de QA', () => {
    expect(desplegar).toMatch(/imagen-qa:\s+if: github\.ref == 'refs\/heads\/develop'/);
    expect(desplegar).toContain('environment: qa');
  });

  it('main construye la imagen de producción con el mismo nombre de imagen', () => {
    expect(desplegar).toMatch(/imagen-produccion:\s+if: github\.ref == 'refs\/heads\/main'/);
    expect(desplegar).toContain('environment: production');
    expect(desplegar.match(/image-name: frontend-app-buses/g)).toHaveLength(2);
  });

  it('el CI compila y corre las pruebas en cada push y pull request', () => {
    expect(ci).toMatch(/pull_request:/);
    expect(ci).toContain('npm run build');
    expect(ci).toContain('npx vitest run');
  });
});
