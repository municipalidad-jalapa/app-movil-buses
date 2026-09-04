import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
