import { z } from 'zod';

/**
 * Resolucion de la configuracion de la app.
 *
 * Se mantiene compatibilidad con la version anterior (`apiUrl`) y con la nueva
 * variante (`apiBaseUrl`) usada por algunos modulos del merge.
 */

const esquemaEntorno = z.object({
  VITE_API_BASE_URL: z.string().trim().url().optional(),
  VITE_API_URL: z.string().trim().url().optional(),
});

export interface ConfiguracionEcoRuta {
  apiUrl: string;
  apiBaseUrl: string;
}

declare global {
  interface Window {
    __ECORUTA__?: Partial<{ apiUrl?: string; apiBaseUrl?: string }>;
  }
}

const API_URL_POR_DEFECTO = 'http://localhost:8080';

function normalizarUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolverApiUrl(): string {
  const deRuntime = typeof window !== 'undefined' ? window.__ECORUTA__?.apiUrl : undefined;
  const deRuntimeBase = typeof window !== 'undefined' ? window.__ECORUTA__?.apiBaseUrl : undefined;
  const deBuild = import.meta.env?.VITE_API_URL ?? import.meta.env?.VITE_API_BASE_URL;
  const valor = deRuntime?.trim() ?? deRuntimeBase?.trim() ?? deBuild?.trim() ?? API_URL_POR_DEFECTO;
  return normalizarUrl(valor);
}

export function obtenerConfiguracion(): ConfiguracionEcoRuta {
  const apiUrl = resolverApiUrl();
  return { apiUrl, apiBaseUrl: apiUrl };
}

export function leerConfiguracion(
  origen: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>,
): ConfiguracionEcoRuta {
  const resultado = esquemaEntorno.safeParse({
    VITE_API_BASE_URL: origen.VITE_API_BASE_URL,
    VITE_API_URL: origen.VITE_API_URL,
  });

  const apiUrl = resultado.success
    ? normalizarUrl((resultado.data.VITE_API_BASE_URL ?? resultado.data.VITE_API_URL ?? resolverApiUrl()))
    : resolverApiUrl();

  return { apiUrl, apiBaseUrl: apiUrl };
}

export const config: ConfiguracionEcoRuta = leerConfiguracion();
