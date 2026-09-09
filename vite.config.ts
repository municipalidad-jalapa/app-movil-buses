import { copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import type { Plugin, ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);

/**
 * Copia el worker de MapLibre --y su fragmento compartido-- junto al bundle.
 *
 * MapLibre calcula la URL de su worker en tiempo de ejecucion, con
 * `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. Rollup no puede
 * analizar eso, asi que el build nunca emite ese fichero: la peticion cae en el
 * index.html de respaldo de nginx y el worker no arranca.
 *
 * Y falla en silencio: MapLibre solo reporta "module worker not supported". El
 * raster se decodifica en el hilo principal, asi que el mapa base se ve
 * perfecto y todo lo que depende del worker --las fuentes GeoJSON de la ruta y
 * las paradas-- no se dibuja nunca, sin un solo error en consola.
 *
 * Se copian los dos con su nombre original a proposito: el worker importa
 * `./maplibre-gl-shared.mjs` como hermano, y la URL que MapLibre calcula sale
 * relativa al bundle. Renombrarlos (por ejemplo con un import `?url`) rompe las
 * dos cosas.
 *
 * `optimizeDeps.exclude` de abajo arregla lo mismo en `vite dev`, pero no toca
 * el build de produccion.
 */
function copiarWorkerDeMapLibre(): Plugin {
  const FICHEROS = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
  let config: ResolvedConfig;

  return {
    name: 'copiar-worker-maplibre',
    apply: 'build',
    configResolved(resuelta) {
      config = resuelta;
    },
    closeBundle() {
      const origen = path.dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
      const destino = path.resolve(config.root, config.build.outDir, config.build.assetsDir);
      for (const fichero of FICHEROS) {
        copyFileSync(path.join(origen, fichero), path.join(destino, fichero));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copiarWorkerDeMapLibre()],
  // MapLibre 6 parsea el GeoJSON en un web worker que carga como fichero
  // hermano (dist/maplibre-gl-worker.mjs). Si Vite lo pre-empaqueta, el bundle
  // queda en .vite/deps/ sin ese hermano al lado, la URL del worker da 404 y el
  // worker no arranca. MapLibre no lo reporta: solo captura "module worker not
  // supported", asi que el mapa base (raster, hilo principal) se ve bien y las
  // capas GeoJSON --ruta y paradas-- no se dibujan nunca, sin un solo error.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    port: 5173,
    // Permite abrir la app desde el telefono en la misma red wifi.
    // El diseno es movil primero: hay que probarlo en un telefono de verdad.
    host: true,
  },
  build: {
    // La ruta tiene cobertura irregular y HU-50 exige cargar en menos de 3 s:
    // avisamos si el bundle empieza a crecer de mas.
    chunkSizeWarningLimit: 300,
  },
  test: {
    environment: 'node',
    env: {
      VITE_API_BASE_URL: 'https://api.ejemplo.test',
      VITE_FIREBASE_API_KEY: 'clave-firebase-prueba',
      VITE_FIREBASE_AUTH_DOMAIN: 'ecoruta-prueba.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'ecoruta-prueba',
      VITE_FIREBASE_APP_ID: '1:1:web:prueba',
      VITE_AUTH_CONDUCTOR_SIMULADO: 'false',
    },
  },
});
