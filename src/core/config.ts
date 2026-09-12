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

function cadenaObligatoria(variable: string) {
  return z
    .string({
      error: `Falta la variable ${variable}. Copiá .env.example a .env y completala.`,
    })
    .trim()
    .min(1, `Falta la variable ${variable}. Copiá .env.example a .env y completala.`);
}

const esquemaEntorno = z.object({
  VITE_API_BASE_URL: z.url({
    error: 'VITE_API_BASE_URL falta o no es una URL valida. Usa el formato https://api.ejemplo.com',
  }),
  VITE_FIREBASE_API_KEY: cadenaObligatoria('VITE_FIREBASE_API_KEY'),
  VITE_FIREBASE_AUTH_DOMAIN: cadenaObligatoria('VITE_FIREBASE_AUTH_DOMAIN'),
  VITE_FIREBASE_PROJECT_ID: cadenaObligatoria('VITE_FIREBASE_PROJECT_ID'),
  VITE_FIREBASE_APP_ID: cadenaObligatoria('VITE_FIREBASE_APP_ID'),
  VITE_AUTH_CONDUCTOR_SIMULADO: z.string().optional(),
});

export interface ConfiguracionEcoRuta {
  readonly apiBaseUrl: string;
  readonly firebaseApiKey: string;
  readonly firebaseAuthDomain: string;
  readonly firebaseProjectId: string;
  readonly firebaseAppId: string;
  /** Solo desarrollo local. Nunca true en produccion. */
  readonly authConductorSimulado: boolean;
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
    if (
      variable === 'VITE_FIREBASE_API_KEY' ||
      variable === 'VITE_FIREBASE_AUTH_DOMAIN' ||
      variable === 'VITE_FIREBASE_PROJECT_ID' ||
      variable === 'VITE_FIREBASE_APP_ID'
    ) {
      return `Falta la variable ${variable}. Copiá .env.example a .env y completala.`;
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
    VITE_FIREBASE_API_KEY: origen.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: origen.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: origen.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_APP_ID: origen.VITE_FIREBASE_APP_ID,
    VITE_AUTH_CONDUCTOR_SIMULADO: origen.VITE_AUTH_CONDUCTOR_SIMULADO,
  });

  if (!resultado.success) {
    throw new Error(mensajeDeValidacion(resultado.error, origen));
  }

  return Object.freeze({
    apiBaseUrl: normalizarUrl(resultado.data.VITE_API_BASE_URL),
    firebaseApiKey: resultado.data.VITE_FIREBASE_API_KEY,
    firebaseAuthDomain: resultado.data.VITE_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: resultado.data.VITE_FIREBASE_PROJECT_ID,
    firebaseAppId: resultado.data.VITE_FIREBASE_APP_ID,
    authConductorSimulado: resultado.data.VITE_AUTH_CONDUCTOR_SIMULADO === 'true',
  });
}

/** Configuracion validada al cargar el modulo. Fail-fast. */
export const config: ConfiguracionEcoRuta = leerConfiguracion();
