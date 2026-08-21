import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
  },
});
