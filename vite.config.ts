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
      // Las VITE_FIREBASE_* se omiten a proposito: config.mensajeria queda en
      // null y las pruebas comprueban que la app funciona con los avisos
      // apagados, que es como corre hoy en CI. Los casos con Firebase
      // configurado pasan el entorno a mano a leerConfiguracion().
      //
      // Este 'false' es obligatorio, no decorativo: Vitest carga el .env del
      // desarrollador, y si alguien tiene VITE_SIMULAR_ABORDAJE=true para
      // demostrar la historia, confirmarAbordaje devolveria la respuesta
      // simulada y las pruebas del contrato pasarian sin tocar la API.
      VITE_SIMULAR_ABORDAJE: 'false',
    },
  },
});
