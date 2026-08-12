/**
 * Resolucion de la configuracion de la app.
 *
 * El criterio de HU-26 es que la URL del backend se pueda cambiar por entorno
 * "sin recompilar". Las variables `import.meta.env.VITE_*` de Vite NO sirven para
 * eso: se incrustan en el bundle en tiempo de build. Por eso la fuente principal
 * es `public/config.js`, que se sirve como archivo aparte y se puede editar en el
 * servidor.
 */

export interface ConfiguracionEcoRuta {
  apiUrl: string;
}

declare global {
  interface Window {
    __ECORUTA__?: Partial<ConfiguracionEcoRuta>;
  }
}

const API_URL_POR_DEFECTO = 'http://localhost:8080';

/** Quita la barra final para que las rutas se concatenen sin duplicarla. */
function normalizarUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Orden de precedencia:
 * 1. `window.__ECORUTA__.apiUrl` — config de runtime, editable sin recompilar.
 * 2. `VITE_API_URL` — comodidad para desarrollo local.
 * 3. `http://localhost:8080` — backend levantado con docker compose.
 */
export function obtenerConfiguracion(): ConfiguracionEcoRuta {
  const deRuntime = typeof window !== 'undefined' ? window.__ECORUTA__?.apiUrl : undefined;
  const deBuild = import.meta.env?.VITE_API_URL as string | undefined;

  const apiUrl = deRuntime?.trim() || deBuild?.trim() || API_URL_POR_DEFECTO;

  return { apiUrl: normalizarUrl(apiUrl) };
}
