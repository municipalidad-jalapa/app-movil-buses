import { z } from 'zod';

/**
 * Configuracion de la app (HU-128).
 *
 * Unico punto de acceso a variables de entorno. Nadie mas debe leer
 * `import.meta.env`. Si falta un valor o el formato es invalido, este modulo
 * lanza al cargarse: la app no arranca a medias.
 *
 * Las variables VITE_ viajan en el bundle. No pongas secretos de servidor.
 */

const esquemaEntorno = z.object({
  VITE_API_BASE_URL: z.url({
    error: 'VITE_API_BASE_URL falta o no es una URL valida. Usa el formato https://api.ejemplo.com',
  }),
});

export interface ConfiguracionEcoRuta {
  readonly apiBaseUrl: string;
}

/** Quita la barra final para que las rutas se concatenen sin duplicarla. */
function normalizarUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function mensajeDeValidacion(error: z.ZodError, origen: Record<string, unknown>): string {
  const lineas = error.issues.map((issue) => {
    const variable = issue.path[0] ? String(issue.path[0]) : 'configuracion';
    const recibido = origen[variable];
    const ausente = recibido === undefined || recibido === null || String(recibido).trim() === '';

    if (variable === 'VITE_API_BASE_URL') {
      return ausente
        ? 'Falta la variable VITE_API_BASE_URL. Copiá .env.example a .env y completala.'
        : `VITE_API_BASE_URL no es una URL valida (valor recibido: "${String(recibido)}"). Usa el formato https://api.ejemplo.com`;
    }
    return `${variable}: ${issue.message}`;
  });
  return `Configuracion invalida. La aplicacion no puede arrancar.\n${lineas.join('\n')}`;
}

/**
 * Valida el origen de entorno y devuelve el objeto tipado.
 * Exportada para pruebas; en runtime se usa `config`.
 */
export function leerConfiguracion(
  origen: Record<string, unknown> = import.meta.env as unknown as Record<string, unknown>,
): ConfiguracionEcoRuta {
  const resultado = esquemaEntorno.safeParse({
    VITE_API_BASE_URL: origen.VITE_API_BASE_URL,
  });

  if (!resultado.success) {
    throw new Error(mensajeDeValidacion(resultado.error, origen));
  }

  return Object.freeze({
    apiBaseUrl: normalizarUrl(resultado.data.VITE_API_BASE_URL),
  });
}

/** Configuracion validada al cargar el modulo. Fail-fast. */
export const config: ConfiguracionEcoRuta = leerConfiguracion();
