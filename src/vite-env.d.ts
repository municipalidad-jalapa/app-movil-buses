/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_AUTH_CONDUCTOR_SIMULADO?: string;
  /** Teselas del mapa, URL con {z}/{x}/{y} separadas por coma (core/estiloMapa.ts). */
  readonly VITE_MAPA_TESELAS?: string;
  readonly VITE_MAPA_TESELAS_OSCURO?: string;
  readonly VITE_MAPA_ATRIBUCION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
